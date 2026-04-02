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
    basico: ["campaign_id", "campaign_name", "impressions", "reach", "clicks", "spend", "cpc", "ctr", "cpm", "frequency", "actions"],
    completo: ["campaign_id", "campaign_name", "adset_id", "adset_name", "impressions", "reach", "clicks", "spend", "cpc", "ctr", "cpm", "frequency", "actions"],
    detalhado: ["campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name", "impressions", "reach", "clicks", "spend", "cpc", "ctr", "cpm", "frequency", "actions"]
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
    const summary = rows.reduce(
      (acc, row) => {
        acc.spend += toNumber(row.spend);
        acc.impressions += toNumber(row.impressions);
        acc.reach += toNumber(row.reach);
        acc.clicks += toNumber(row.clicks);
        acc.leads += getLeadCount(row.actions);
        return acc;
      },
      { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0 }
    );

    summary.ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
    summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0;
    summary.cpl = summary.leads > 0 ? summary.spend / summary.leads : 0;

    const adMediaMap = level === "ad"
      ? await fetchAdMediaMap(apiVersion, accessToken, rows.map((row) => String(row.ad_id || "")))
      : {};

    const topRows = rows
      .map((row) => {
        const primaryResult = getPrimaryResult(row.actions);
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
          spend: toNumber(row.spend),
          clicks: toNumber(row.clicks),
          impressions: toNumber(row.impressions),
          reach: toNumber(row.reach),
          ctr: toNumber(row.ctr),
          cpc: toNumber(row.cpc),
          cpm: toNumber(row.cpm),
          frequency: toNumber(row.frequency),
          leads: getLeadCount(row.actions),
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
        totalRows: rows.length
      },
      summary,
      rows: topRows
    });
  } catch (error) {
    return json(response, 502, { error: "Falha de rede ao consultar Meta API.", detail: error.message });
  }
};
