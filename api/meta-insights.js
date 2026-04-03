const { createAdminClient, getAuthenticatedUser } = require("./_lib/supabase");
const { decryptText } = require("./_lib/crypto");
const { json, parseJsonBody } = require("./_lib/http");

function getDateRange(days) {
  const now = new Date();
  const until = now.toISOString().slice(0, 10);
  const sinceDate = new Date(now);
  sinceDate.setDate(now.getDate() - (days - 1));
  const since = sinceDate.toISOString().slice(0, 10);
  return { since, until };
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function safeNumber(value) {
  return Math.max(0, toNumber(value));
}

function sanitizeActionType(value, fallback = "lead") {
  const type = String(value || "").trim().toLowerCase();
  return /^[a-z0-9_.]+$/.test(type) ? type : fallback;
}

function sumAction(actions, type) {
  if (!Array.isArray(actions)) return 0;
  const found = actions.find((item) => item.action_type === type);
  return found ? toNumber(found.value) : 0;
}

function sumActionsByTypes(actions, types) {
  if (!Array.isArray(actions)) return 0;
  return actions.reduce((acc, item) => {
    if (!item || !types.includes(item.action_type)) return acc;
    return acc + toNumber(item.value);
  }, 0);
}

const LEAD_ACTION_TYPES = [
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "onsite_web_lead",
  "omni_lead",
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
  "onsite_conversion.contact_total",
  "submit_application"
];

function getLeadCount(actions) {
  return sumActionsByTypes(actions, LEAD_ACTION_TYPES);
}

function aggregateActions(actions = []) {
  const totals = {};
  if (!Array.isArray(actions)) return totals;
  actions.forEach((item) => {
    if (!item || !item.action_type) return;
    const key = String(item.action_type);
    totals[key] = (totals[key] || 0) + safeNumber(item.value);
  });
  return totals;
}

function getPrimaryResultFromTotals(actionTotals = {}) {
  const entries = Object.entries(actionTotals);
  if (entries.length === 0) return { type: "-", value: 0 };

  const priority = [
    "lead",
    "onsite_conversion.lead_grouped",
    "offsite_conversion.fb_pixel_lead",
    "onsite_web_lead",
    "omni_lead",
    "onsite_conversion.messaging_conversation_started_7d",
    "onsite_conversion.messaging_first_reply",
    "onsite_conversion.contact_total",
    "submit_application",
    "purchase",
    "offsite_conversion.fb_pixel_purchase",
    "complete_registration",
    "initiate_checkout",
    "add_to_cart",
    "link_click"
  ];

  for (const type of priority) {
    if (actionTotals[type] > 0) {
      return { type, value: safeNumber(actionTotals[type]) };
    }
  }

  const fallback = entries.sort((a, b) => safeNumber(b[1]) - safeNumber(a[1]))[0];
  return { type: fallback ? fallback[0] : "-", value: fallback ? safeNumber(fallback[1]) : 0 };
}

function mergeActionTotals(base, extra) {
  Object.entries(extra || {}).forEach(([key, value]) => {
    base[key] = (base[key] || 0) + safeNumber(value);
  });
}

function sumActionTotals(actionTotals = {}, types = []) {
  return types.reduce((acc, type) => acc + safeNumber(actionTotals[type]), 0);
}

function buildAdvancedFromTotals(actionTotals = {}, uniqueActionTotals = {}, spend = 0, impressions = 0, clicks = 0, leads = 0, focusType = "lead") {
  const linkClicks = sumActionTotals(actionTotals, ["link_click", "inline_link_click"]);
  const outboundClicks = sumActionTotals(actionTotals, ["outbound_click"]);
  const uniqueLinkClicks = sumActionTotals(uniqueActionTotals, ["link_click", "inline_link_click"]);
  const msg7d = sumActionTotals(actionTotals, ["onsite_conversion.messaging_conversation_started_7d"]);
  const msgFirstReply = sumActionTotals(actionTotals, ["onsite_conversion.messaging_first_reply"]);
  const contactTotal = sumActionTotals(actionTotals, ["onsite_conversion.contact_total"]);
  const purchase = sumActionTotals(actionTotals, ["purchase", "offsite_conversion.fb_pixel_purchase"]);
  const initiateCheckout = sumActionTotals(actionTotals, ["initiate_checkout"]);
  const addToCart = sumActionTotals(actionTotals, ["add_to_cart"]);
  const completeRegistration = sumActionTotals(actionTotals, ["complete_registration"]);
  const postEngagement = sumActionTotals(actionTotals, ["post_engagement", "post_reaction", "comment", "post", "post_saved"]);
  const videoViews = sumActionTotals(actionTotals, ["video_view", "thruplay"]);
  const focusResults = safeNumber(actionTotals[focusType]);

  return {
    link_clicks: linkClicks,
    outbound_clicks: outboundClicks,
    unique_link_clicks: uniqueLinkClicks,
    messaging_conversation_started_7d: msg7d,
    messaging_first_reply: msgFirstReply,
    contact_total: contactTotal,
    purchase,
    initiate_checkout: initiateCheckout,
    add_to_cart: addToCart,
    complete_registration: completeRegistration,
    post_engagement: postEngagement,
    video_views: videoViews,
    link_ctr: impressions > 0 ? (linkClicks / impressions) * 100 : 0,
    outbound_ctr: impressions > 0 ? (outboundClicks / impressions) * 100 : 0,
    link_cpc: linkClicks > 0 ? spend / linkClicks : 0,
    click_to_lead_rate: clicks > 0 ? (leads / clicks) * 100 : 0,
    focus_action_type: focusType,
    focus_results: focusResults,
    focus_cost: focusResults > 0 ? spend / focusResults : 0
  };
}

function calcRowMetrics(row) {
  const spend = safeNumber(row.spend);
  const impressions = safeNumber(row.impressions);
  const reach = safeNumber(row.reach);
  const clicks = safeNumber(row.clicks);
  const leads = safeNumber(getLeadCount(row.actions));

  return {
    spend,
    impressions,
    reach,
    clicks,
    leads,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    frequency: reach > 0 ? impressions / reach : 0,
    cpl: leads > 0 ? spend / leads : 0
  };
}

function getPrimaryResult(actions) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return { type: "-", value: 0 };
  }

  const priority = [
    "lead",
    "offsite_conversion.fb_pixel_lead",
    "purchase",
    "offsite_conversion.fb_pixel_purchase",
    "complete_registration",
    "initiate_checkout",
    "add_to_cart",
    "link_click"
  ];

  for (const type of priority) {
    const item = actions.find((entry) => entry.action_type === type);
    if (item) {
      return { type, value: toNumber(item.value) };
    }
  }

  const fallback = actions.find((entry) => toNumber(entry.value) > 0) || actions[0];
  return {
    type: fallback && fallback.action_type ? fallback.action_type : "-",
    value: fallback ? toNumber(fallback.value) : 0
  };
}

async function fetchAdMediaMap(apiVersion, accessToken, adIds) {
  const uniqueAdIds = Array.from(new Set((adIds || []).filter((id) => /^\d+$/.test(String(id))))).slice(0, 50);
  if (uniqueAdIds.length === 0) return {};

  const query = new URLSearchParams();
  query.set("access_token", accessToken);
  query.set("ids", uniqueAdIds.join(","));
  query.set("fields", "id,name,creative{id,name,thumbnail_url,image_url,object_story_spec}");

  const url = `https://graph.facebook.com/${apiVersion}/?${query.toString()}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || !data || typeof data !== "object") return {};

    const mediaMap = {};
    uniqueAdIds.forEach((adId) => {
      const ad = data[adId];
      if (!ad) return;

      const creative = ad.creative || {};
      const story = creative.object_story_spec || {};
      const videoId = story.video_data?.video_id || story.template_data?.video_id || null;
      const imageUrl = creative.image_url || story.link_data?.picture || story.photo_data?.image_url || null;
      const thumbnailUrl = creative.thumbnail_url || imageUrl || null;

      mediaMap[adId] = {
        creative_id: creative.id || null,
        creative_name: creative.name || null,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        video_id: videoId,
        video_watch_url: videoId ? `https://www.facebook.com/watch/?v=${videoId}` : null
      };
    });

    return mediaMap;
  } catch (_) {
    return {};
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, 405, { error: "Use POST." });
  }

  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return json(response, 401, { error: "Login necessário." });
  }

  let body;
  try {
    body = await parseJsonBody(request);
  } catch (error) {
    return json(response, 400, { error: error.message });
  }

  const apiVersion = String(body.apiVersion || "v25.0").trim();
  const reportType = String(body.reportType || "basico").trim().toLowerCase();
  const agencyMetricFocus = sanitizeActionType(body.agencyMetricFocus || "lead", "lead");
  const adAccountId = String(body.adAccountId || "").trim().replace(/^act_/, "");

  if (!/^v\d+\.\d+$/.test(apiVersion)) {
    return json(response, 400, { error: "Versão de API inválida." });
  }
  if (!/^\d+$/.test(adAccountId)) {
    return json(response, 400, { error: "ID da conta de anúncio inválido." });
  }

  let since, until;
  if (body.dateStart && body.dateEnd) {
    since = String(body.dateStart).slice(0, 10);
    until = String(body.dateEnd).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
      return json(response, 400, { error: "Formato de data inválido. Use YYYY-MM-DD." });
    }
  } else {
    const periodDays = [1, 15, 30].includes(Number(body.periodDays)) ? Number(body.periodDays) : 1;
    ({ since, until } = getDateRange(periodDays));
  }

  const periodDays = body.periodDays || null;

  const admin = createAdminClient();
  const { data: tokenRow, error: tokenError } = await admin
    .from("user_meta_tokens")
    .select("encrypted_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (tokenError) {
    return json(response, 500, { error: "Erro ao recuperar token Meta.", detail: tokenError.message });
  }
  if (!tokenRow) {
    return json(response, 403, { error: "Token Meta não configurado. Salve o token antes de consultar." });
  }

  const accessToken = decryptText(tokenRow.encrypted_token);

  const levelByType = { basico: "campaign", completo: "adset", detalhado: "ad" };
  const fieldsByType = {
    basico: ["campaign_id", "campaign_name", "impressions", "reach", "clicks", "spend", "cpc", "ctr", "cpm", "frequency", "actions", "unique_actions", "purchase_roas"],
    completo: ["campaign_id", "campaign_name", "adset_id", "adset_name", "impressions", "reach", "clicks", "spend", "cpc", "ctr", "cpm", "frequency", "actions", "unique_actions", "purchase_roas"],
    detalhado: ["campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name", "impressions", "reach", "clicks", "spend", "cpc", "ctr", "cpm", "frequency", "actions", "unique_actions", "purchase_roas"]
  };

  const level = levelByType[reportType] || "campaign";
  const fields = fieldsByType[reportType] || fieldsByType.basico;

  const query = new URLSearchParams();
  query.set("access_token", accessToken);
  query.set("fields", fields.join(","));
  query.set("level", level);
  query.set("limit", "200");
  query.set("time_range", JSON.stringify({ since, until }));

  const url = `https://graph.facebook.com/${apiVersion}/act_${adAccountId}/insights?${query.toString()}`;

  try {
    const metaResponse = await fetch(url);
    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      return json(response, metaResponse.status, { error: "Erro na Meta API", detail: metaData });
    }

    const rows = Array.isArray(metaData.data) ? metaData.data : [];

    const normalizedRows = rows.map((row) => {
      const metrics = calcRowMetrics(row);
      const actionTotals = aggregateActions(row.actions);
      const uniqueActionTotals = aggregateActions(row.unique_actions);
      const primaryResult = getPrimaryResultFromTotals(actionTotals);
      const advanced = buildAdvancedFromTotals(
        actionTotals,
        uniqueActionTotals,
        metrics.spend,
        metrics.impressions,
        metrics.clicks,
        metrics.leads,
        agencyMetricFocus
      );
      const purchaseRoas = Array.isArray(row.purchase_roas)
        ? row.purchase_roas.reduce((acc, item) => acc + safeNumber(item && item.value), 0)
        : 0;
      return {
        raw: row,
        metrics,
        actionTotals,
        uniqueActionTotals,
        primaryResult,
        advanced,
        purchaseRoas
      };
    });

    const summary = normalizedRows.reduce(
      (acc, row) => {
        acc.spend += row.metrics.spend;
        acc.impressions += row.metrics.impressions;
        acc.reach += row.metrics.reach;
        acc.clicks += row.metrics.clicks;
        acc.leads += row.metrics.leads;
        mergeActionTotals(acc.actionTotals, row.actionTotals);
        mergeActionTotals(acc.uniqueActionTotals, row.uniqueActionTotals);
        acc.purchaseRoas += row.purchaseRoas;
        return acc;
      },
      { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0, actionTotals: {}, uniqueActionTotals: {}, purchaseRoas: 0 }
    );

    summary.ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
    summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0;
    summary.cpm = summary.impressions > 0 ? (summary.spend / summary.impressions) * 1000 : 0;
    summary.frequency = summary.reach > 0 ? summary.impressions / summary.reach : 0;
    summary.cpl = summary.leads > 0 ? summary.spend / summary.leads : 0;
    const primarySummaryResult = getPrimaryResultFromTotals(summary.actionTotals);
    const focusResults = safeNumber(summary.actionTotals[agencyMetricFocus]);
    summary.result_type = agencyMetricFocus;
    summary.total_results = focusResults;
    summary.primary_result_type = primarySummaryResult.type;
    summary.primary_result_value = primarySummaryResult.value;
    summary.focus_action_type = agencyMetricFocus;
    summary.focus_results = focusResults;
    summary.focus_cost = focusResults > 0 ? summary.spend / focusResults : 0;
    summary.advanced = buildAdvancedFromTotals(
      summary.actionTotals,
      summary.uniqueActionTotals,
      summary.spend,
      summary.impressions,
      summary.clicks,
      summary.leads,
      agencyMetricFocus
    );
    summary.advanced.purchase_roas = normalizedRows.length > 0 ? summary.purchaseRoas / normalizedRows.length : 0;

    const adMediaMap = level === "ad"
      ? await fetchAdMediaMap(apiVersion, accessToken, rows.map((row) => String(row.ad_id || "")))
      : {};

    const topRows = normalizedRows
      .map((normalized) => {
        const row = normalized.raw;
        const primaryResult = normalized.primaryResult;
        const media = adMediaMap[String(row.ad_id || "")] || {};
        return {
          campaign_id: row.campaign_id || "-",
          campaign_name: row.campaign_name || "-",
          adset_id: row.adset_id || "-",
          adset_name: row.adset_name || "-",
          ad_id: row.ad_id || "-",
          ad_name: row.ad_name || "-",
          level,
          item_type: level === "campaign" ? "Campanha" : level === "adset" ? "Conjunto" : "Anuncio",
          spend: normalized.metrics.spend,
          clicks: normalized.metrics.clicks,
          impressions: normalized.metrics.impressions,
          reach: normalized.metrics.reach,
          ctr: normalized.metrics.ctr,
          cpc: normalized.metrics.cpc,
          cpm: normalized.metrics.cpm,
          frequency: normalized.metrics.frequency,
          cpl: normalized.metrics.cpl,
          leads: normalized.metrics.leads,
          link_clicks: normalized.advanced.link_clicks,
          outbound_clicks: normalized.advanced.outbound_clicks,
          unique_link_clicks: normalized.advanced.unique_link_clicks,
          messaging_conversation_started_7d: normalized.advanced.messaging_conversation_started_7d,
          messaging_first_reply: normalized.advanced.messaging_first_reply,
          contact_total: normalized.advanced.contact_total,
          purchase: normalized.advanced.purchase,
          initiate_checkout: normalized.advanced.initiate_checkout,
          add_to_cart: normalized.advanced.add_to_cart,
          complete_registration: normalized.advanced.complete_registration,
          post_engagement: normalized.advanced.post_engagement,
          video_views: normalized.advanced.video_views,
          link_ctr: normalized.advanced.link_ctr,
          link_cpc: normalized.advanced.link_cpc,
          focus_action_type: agencyMetricFocus,
          focus_results: normalized.advanced.focus_results,
          focus_cost: normalized.advanced.focus_cost,
          result_type: primaryResult.type,
          results: primaryResult.value,
          creative_id: media.creative_id || null,
          creative_name: media.creative_name || null,
          image_url: media.image_url || null,
          thumbnail_url: media.thumbnail_url || null,
          video_id: media.video_id || null,
          video_watch_url: media.video_watch_url || null
        };
      })
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 50);

    return json(response, 200, {
      ok: true,
      context: {
        reportType,
        periodDays,
        apiVersion,
        adAccountId,
        since,
        until,
        level,
        agencyMetricFocus,
        totalRows: rows.length
      },
      summary,
      rows: topRows
    });
  } catch (error) {
    return json(response, 502, { error: "Falha de rede ao consultar Meta API.", detail: error.message });
  }
};
