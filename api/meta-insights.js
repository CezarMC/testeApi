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

  const apiVersion = String(body.apiVersion || "v22.0").trim();
  const reportType = String(body.reportType || "basico").trim().toLowerCase();
  const periodDays = Number(body.periodDays || 1);
  const adAccountId = String(body.adAccountId || "").trim().replace(/^act_/, "");

  if (!/^v\d+\.\d+$/.test(apiVersion)) {
    return json(response, 400, { error: "Versão de API inválida." });
  }
  if (!/^\d+$/.test(adAccountId)) {
    return json(response, 400, { error: "ID da conta de anúncio inválido." });
  }
  if (![1, 15, 30].includes(periodDays)) {
    return json(response, 400, { error: "Período inválido. Use 1, 15 ou 30." });
  }

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
    basico: ["campaign_name", "impressions", "reach", "clicks", "spend", "cpc", "ctr", "actions"],
    completo: ["campaign_name", "adset_name", "impressions", "reach", "clicks", "spend", "cpc", "ctr", "cpm", "frequency", "actions"],
    detalhado: ["campaign_name", "adset_name", "ad_name", "impressions", "reach", "clicks", "spend", "cpc", "ctr", "cpm", "frequency", "actions"]
  };

  const level = levelByType[reportType] || "campaign";
  const fields = fieldsByType[reportType] || fieldsByType.basico;
  const { since, until } = getDateRange(periodDays);

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
        acc.leads += sumAction(row.actions, "lead");
        return acc;
      },
      { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0 }
    );

    summary.ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
    summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0;
    summary.cpl = summary.leads > 0 ? summary.spend / summary.leads : 0;

    const topRows = rows
      .map((row) => ({
        campaign_name: row.campaign_name || "-",
        adset_name: row.adset_name || "-",
        ad_name: row.ad_name || "-",
        spend: toNumber(row.spend),
        clicks: toNumber(row.clicks),
        impressions: toNumber(row.impressions),
        ctr: toNumber(row.ctr),
        cpc: toNumber(row.cpc),
        cpm: toNumber(row.cpm),
        frequency: toNumber(row.frequency),
        leads: sumAction(row.actions, "lead")
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 20);

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
