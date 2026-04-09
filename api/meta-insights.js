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

// Tipos usados para contar leads sem dupla contagem.
// Excluídos deliberadamente:
//   onsite_conversion.lead_grouped – agrupamento que sobrepõe lead + onsite_web_lead
//   omni_lead                      – agrupamento omnichannel, sobrepõe outros tipos
//   onsite_conversion.messaging_first_reply – mesmo usuário de messaging_conversation_started_7d
const LEAD_ACTION_TYPES = [
  "lead",
  "offsite_conversion.fb_pixel_lead",
  "onsite_web_lead",
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.contact_total",
  "submit_application"
];

const MESSAGE_ACTION_TYPES = [
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply"
];

const CONTACT_ACTION_TYPES = [
  "onsite_conversion.contact_total"
];

const PURCHASE_ACTION_TYPES = [
  "purchase",
  "offsite_conversion.fb_pixel_purchase"
];

const CHECKOUT_ACTION_TYPES = [
  "initiate_checkout"
];

const ADD_TO_CART_ACTION_TYPES = [
  "add_to_cart"
];

const REGISTRATION_ACTION_TYPES = [
  "complete_registration",
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

function aggregateActionValues(values = []) {
  const totals = {};
  if (!Array.isArray(values)) return totals;
  values.forEach((item) => {
    if (!item || !item.action_type) return;
    const key = String(item.action_type);
    totals[key] = (totals[key] || 0) + safeNumber(item.value);
  });
  return totals;
}

function getActionTypesForFocus(focusType = "lead") {
  const type = String(focusType || "").trim().toLowerCase();
  if (!type) return [];

  const aliases = {
    lead: LEAD_ACTION_TYPES,
    leads: LEAD_ACTION_TYPES,
    mensagem: MESSAGE_ACTION_TYPES,
    mensagens: MESSAGE_ACTION_TYPES,
    message: MESSAGE_ACTION_TYPES,
    messages: MESSAGE_ACTION_TYPES,
    contato: CONTACT_ACTION_TYPES,
    contact: CONTACT_ACTION_TYPES,
    purchase: PURCHASE_ACTION_TYPES,
    purchases: PURCHASE_ACTION_TYPES,
    compra: PURCHASE_ACTION_TYPES,
    compras: PURCHASE_ACTION_TYPES,
    checkout: CHECKOUT_ACTION_TYPES,
    initiate_checkout: CHECKOUT_ACTION_TYPES,
    add_to_cart: ADD_TO_CART_ACTION_TYPES,
    carrinho: ADD_TO_CART_ACTION_TYPES,
    cadastro: REGISTRATION_ACTION_TYPES,
    registration: REGISTRATION_ACTION_TYPES,
    complete_registration: REGISTRATION_ACTION_TYPES
  };

  return aliases[type] || [type];
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

function getFocusResultsFromTotals(actionTotals = {}, focusType = "lead") {
  const focusTypes = getActionTypesForFocus(focusType);
  if (focusTypes.length === 0) return 0;
  return sumActionTotals(actionTotals, focusTypes);
}

function getFocusLabel(focusType = "lead") {
  const type = String(focusType || "").trim().toLowerCase();
  const labels = {
    lead: "Leads",
    leads: "Leads",
    mensagem: "Mensagens",
    mensagens: "Mensagens",
    message: "Mensagens",
    messages: "Mensagens",
    contato: "Contatos",
    contact: "Contatos",
    purchase: "Compras",
    purchases: "Compras",
    compra: "Compras",
    compras: "Compras",
    checkout: "Checkouts",
    initiate_checkout: "Checkouts",
    add_to_cart: "Carrinhos",
    carrinho: "Carrinhos",
    cadastro: "Cadastros",
    registration: "Cadastros",
    complete_registration: "Cadastros"
  };
  return labels[type] || "Resultados";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildKpis(summary = {}, focusType = "lead") {
  const spend = safeNumber(summary.spend);
  const impressions = safeNumber(summary.impressions);
  const reach = safeNumber(summary.reach);
  const clicks = safeNumber(summary.clicks);
  const leads = safeNumber(summary.leads);
  const ctr = safeNumber(summary.ctr);
  const cpc = safeNumber(summary.cpc);
  const cpm = safeNumber(summary.cpm);
  const frequency = safeNumber(summary.frequency);

  const advanced = summary.advanced || {};
  const focusResults = safeNumber(summary.focus_results);
  const focusCost = focusResults > 0 ? spend / focusResults : 0;
  const linkClicks = safeNumber(advanced.link_clicks);
  const outboundClicks = safeNumber(advanced.outbound_clicks);
  const linkCtr = safeNumber(advanced.link_ctr);
  const outboundCtr = safeNumber(advanced.outbound_ctr);
  const linkCpc = safeNumber(advanced.link_cpc);
  const lpv = safeNumber(advanced.landing_page_view);
  const purchaseValue = safeNumber(advanced.purchase_conversion_value);
  const purchaseRoas = safeNumber(advanced.purchase_roas);

  const clickToFocusRate = clicks > 0 ? (focusResults / clicks) * 100 : 0;
  const linkToFocusRate = linkClicks > 0 ? (focusResults / linkClicks) * 100 : 0;
  const lpvToFocusRate = lpv > 0 ? (focusResults / lpv) * 100 : 0;

  return {
    focus_action_type: focusType,
    focus_label: getFocusLabel(focusType),
    spend,
    impressions,
    reach,
    frequency,
    clicks,
    leads,
    ctr,
    cpc,
    cpm,
    link_clicks: linkClicks,
    outbound_clicks: outboundClicks,
    link_ctr: linkCtr,
    outbound_ctr: outboundCtr,
    link_cpc: linkCpc,
    landing_page_view: lpv,
    focus_results: focusResults,
    focus_cost: focusCost,
    click_to_focus_rate: clickToFocusRate,
    link_to_focus_rate: linkToFocusRate,
    lpv_to_focus_rate: lpvToFocusRate,
    purchase_conversion_value: purchaseValue,
    purchase_roas: purchaseRoas
  };
}

function buildHealthScore(kpis = {}) {
  const ctrScore = clamp((safeNumber(kpis.ctr) / 2) * 100, 0, 100);
  const linkCtrScore = clamp((safeNumber(kpis.link_ctr) / 1.5) * 100, 0, 100);
  const focusRateScore = clamp((safeNumber(kpis.click_to_focus_rate) / 4) * 100, 0, 100);
  const freqPenalty = clamp((safeNumber(kpis.frequency) - 3) * 15, 0, 40);

  const weighted = (ctrScore * 0.28) + (linkCtrScore * 0.27) + (focusRateScore * 0.30) + (100 * 0.15);
  const score = clamp(weighted - freqPenalty, 0, 100);

  let tier = "fraco";
  if (score >= 75) tier = "forte";
  else if (score >= 55) tier = "estavel";

  return {
    score: Math.round(score),
    tier,
    inputs: {
      ctr: safeNumber(kpis.ctr),
      link_ctr: safeNumber(kpis.link_ctr),
      click_to_focus_rate: safeNumber(kpis.click_to_focus_rate),
      frequency: safeNumber(kpis.frequency)
    }
  };
}

function buildAdvancedFromTotals(actionTotals = {}, actionValueTotals = {}, uniqueActionTotals = {}, spend = 0, impressions = 0, clicks = 0, leads = 0, focusType = "lead") {
  const linkClicks = sumActionTotals(actionTotals, ["link_click", "inline_link_click"]);
  const landingPageView = sumActionTotals(actionTotals, ["landing_page_view"]);
  const outboundClicks = sumActionTotals(actionTotals, ["outbound_click"]);
  const uniqueLinkClicks = sumActionTotals(uniqueActionTotals, ["link_click", "inline_link_click"]);
  const msg7d = sumActionTotals(actionTotals, ["onsite_conversion.messaging_conversation_started_7d"]);
  const msgFirstReply = sumActionTotals(actionTotals, ["onsite_conversion.messaging_first_reply"]);
  const contactTotal = sumActionTotals(actionTotals, CONTACT_ACTION_TYPES);
  const purchase = sumActionTotals(actionTotals, PURCHASE_ACTION_TYPES);
  const initiateCheckout = sumActionTotals(actionTotals, CHECKOUT_ACTION_TYPES);
  const addToCart = sumActionTotals(actionTotals, ADD_TO_CART_ACTION_TYPES);
  const completeRegistration = sumActionTotals(actionTotals, ["complete_registration"]);
  const postEngagement = sumActionTotals(actionTotals, ["post_engagement", "post_reaction", "comment", "post", "post_saved"]);
  const videoViews = sumActionTotals(actionTotals, ["video_view", "thruplay"]);
  const focusResults = getFocusResultsFromTotals(actionTotals, focusType);
  const purchaseConversionValue = sumActionTotals(actionValueTotals, PURCHASE_ACTION_TYPES);

  return {
    link_clicks: linkClicks,
    landing_page_view: landingPageView,
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
    purchase_conversion_value: purchaseConversionValue,
    purchase_roas: spend > 0 ? purchaseConversionValue / spend : 0,
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

async function fetchActiveCampaignIds(apiVersion, accessToken, adAccountId) {
  const ids = new Set();
  const query = new URLSearchParams();
  query.set("access_token", accessToken);
  query.set("fields", "id,effective_status");
  query.set("limit", "200");

  let nextUrl = `https://graph.facebook.com/${apiVersion}/act_${adAccountId}/campaigns?${query.toString()}`;
  let pageCount = 0;
  const MAX_PAGES = 20;

  while (nextUrl && pageCount < MAX_PAGES) {
    const response = await fetch(nextUrl);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || "Falha ao listar campanhas da conta.");
    }

    const items = Array.isArray(data?.data) ? data.data : [];
    items.forEach((campaign) => {
      const id = String(campaign?.id || "").trim();
      const status = String(campaign?.effective_status || "").trim().toUpperCase();
      if (id && status === "ACTIVE") ids.add(id);
    });

    nextUrl = data?.paging?.next || null;
    pageCount += 1;
  }

  return ids;
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

  let activeCampaignIds;
  try {
    activeCampaignIds = await fetchActiveCampaignIds(apiVersion, accessToken, adAccountId);
  } catch (error) {
    return json(response, 502, { error: "Falha ao listar campanhas ativas da Meta.", detail: error.message });
  }

  const levelByType = { basico: "campaign", completo: "adset", detalhado: "ad" };
  const fieldsByType = {
    basico: ["campaign_id", "campaign_name", "objective", "impressions", "reach", "clicks", "spend", "cpc", "ctr", "cpm", "frequency", "actions", "action_values", "unique_actions", "purchase_roas"],
    completo: ["campaign_id", "campaign_name", "objective", "adset_id", "adset_name", "impressions", "reach", "clicks", "spend", "cpc", "ctr", "cpm", "frequency", "actions", "action_values", "unique_actions", "purchase_roas"],
    detalhado: ["campaign_id", "campaign_name", "objective", "adset_id", "adset_name", "ad_id", "ad_name", "impressions", "reach", "clicks", "spend", "cpc", "ctr", "cpm", "frequency", "actions", "action_values", "unique_actions", "purchase_roas"]
  };

  const level = levelByType[reportType] || "campaign";
  const fields = fieldsByType[reportType] || fieldsByType.basico;

  const query = new URLSearchParams();
  query.set("access_token", accessToken);
  query.set("fields", fields.join(","));
  query.set("level", level);
  query.set("limit", "200");
  query.set("time_range", JSON.stringify({ since, until }));
  query.set("action_report_time", "conversion");
  query.set("use_account_attribution_setting", "true");
  // use_unified_attribution_setting foi depreciado na v17+ e removido

  const baseUrl = `https://graph.facebook.com/${apiVersion}/act_${adAccountId}/insights`;

  try {
    // Paginação completa: coleta todas as páginas da Graph API
    const rows = [];
    let nextUrl = `${baseUrl}?${query.toString()}`;
    let pageCount = 0;
    const MAX_PAGES = 30;

    while (nextUrl && pageCount < MAX_PAGES) {
      const metaResponse = await fetch(nextUrl);
      const metaData = await metaResponse.json();

      if (!metaResponse.ok) {
        return json(response, metaResponse.status, { error: "Erro na Meta API", detail: metaData });
      }

      if (Array.isArray(metaData.data)) {
        metaData.data.forEach((row) => {
          const campaignId = String(row?.campaign_id || "").trim();
          if (campaignId && activeCampaignIds.has(campaignId)) {
            rows.push(row);
          }
        });
      }

      nextUrl = metaData.paging && metaData.paging.next ? metaData.paging.next : null;
      pageCount += 1;
    }

    const wasTruncated = Boolean(nextUrl);

    const normalizedRows = rows.map((row) => {
      const metrics = calcRowMetrics(row);
      const actionTotals = aggregateActions(row.actions);
      const actionValueTotals = aggregateActionValues(row.action_values);
      const uniqueActionTotals = aggregateActions(row.unique_actions);
      const primaryResult = getPrimaryResultFromTotals(actionTotals);
      const advanced = buildAdvancedFromTotals(
        actionTotals,
        actionValueTotals,
        uniqueActionTotals,
        metrics.spend,
        metrics.impressions,
        metrics.clicks,
        metrics.leads,
        agencyMetricFocus
      );
      return {
        raw: row,
        metrics,
        actionTotals,
        actionValueTotals,
        uniqueActionTotals,
        primaryResult,
        advanced
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
        mergeActionTotals(acc.actionValueTotals, row.actionValueTotals);
        mergeActionTotals(acc.uniqueActionTotals, row.uniqueActionTotals);
        return acc;
      },
      { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0, actionTotals: {}, actionValueTotals: {}, uniqueActionTotals: {} }
    );

    summary.ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
    summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0;
    summary.cpm = summary.impressions > 0 ? (summary.spend / summary.impressions) * 1000 : 0;
    summary.frequency = summary.reach > 0 ? summary.impressions / summary.reach : 0;
    summary.cpl = summary.leads > 0 ? summary.spend / summary.leads : 0;
    const primarySummaryResult = getPrimaryResultFromTotals(summary.actionTotals);
    const focusResults = getFocusResultsFromTotals(summary.actionTotals, agencyMetricFocus);
    summary.result_type = agencyMetricFocus;
    summary.total_results = focusResults;
    summary.primary_result_type = primarySummaryResult.type;
    summary.primary_result_value = primarySummaryResult.value;
    summary.focus_action_type = agencyMetricFocus;
    summary.focus_results = focusResults;
    summary.focus_cost = focusResults > 0 ? summary.spend / focusResults : 0;
    summary.advanced = buildAdvancedFromTotals(
      summary.actionTotals,
      summary.actionValueTotals,
      summary.uniqueActionTotals,
      summary.spend,
      summary.impressions,
      summary.clicks,
      summary.leads,
      agencyMetricFocus
    );
    summary.purchase_conversion_value = summary.advanced.purchase_conversion_value;
    summary.kpis = buildKpis(summary, agencyMetricFocus);
    summary.health = buildHealthScore(summary.kpis);

    // Breakdown de conversões para diagnóstico no painel
    const conversionBreakdown = Object.entries(summary.actionTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([type, value]) => ({ type, value: Math.round(value * 100) / 100 }));

    const adMediaMap = level === "ad"
      ? await fetchAdMediaMap(apiVersion, accessToken, rows.map((row) => String(row.ad_id || "")))
      : {};

    const topRows = normalizedRows
      .map((normalized) => {
        const row = normalized.raw;
        const primaryResult = normalized.primaryResult;
        const focusRowResults = getFocusResultsFromTotals(normalized.actionTotals, agencyMetricFocus);
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
          focus_results: focusRowResults,
          focus_cost: focusRowResults > 0 ? normalized.metrics.spend / focusRowResults : 0,
          objective: row.objective || "-",
          result_type: focusRowResults > 0 ? agencyMetricFocus : (primaryResult.type || "-"),
          results: focusRowResults > 0 ? focusRowResults : primaryResult.value,
          primary_result_type: primaryResult.type,
          primary_result_value: primaryResult.value,
          purchase_conversion_value: normalized.advanced.purchase_conversion_value,
          purchase_roas: normalized.advanced.purchase_roas,
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
        fetchedPages: pageCount,
        wasTruncated,
        graphApi: {
          endpoint: `/${apiVersion}/act_${adAccountId}/insights`,
          action_report_time: "conversion",
          use_account_attribution_setting: true,
          fields
        },
        activeCampaignsOnly: true,
        activeCampaignCount: activeCampaignIds.size,
        activeCampaignIdsList: Array.from(activeCampaignIds),
        conversionBreakdown,
        totalRows: rows.length
      },
      summary,
      rows: topRows
    });
  } catch (error) {
    return json(response, 502, { error: "Falha de rede ao consultar Meta API.", detail: error.message });
  }
};
