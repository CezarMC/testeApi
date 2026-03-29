const { getAuthenticatedUser } = require("./_lib/supabase");
const { json, parseJsonBody } = require("./_lib/http");

function fallbackAdvice(metrics, reportType, periodDays, clientName) {
  const spend = Number(metrics.spend || 0);
  const ctr = Number(metrics.ctr || 0);
  const cpc = Number(metrics.cpc || 0);
  const leads = Number(metrics.leads || 0);
  const cpl = Number(metrics.cpl || 0);
  const notes = [];

  if (spend === 0) notes.push("Nenhum gasto no período. Confirme se a campanha está ativa.");
  if (ctr < 1 && spend > 0) notes.push("CTR baixo. Teste novos criativos e ajuste o texto principal.");
  if (cpc > 3 && spend > 0) notes.push("CPC alto. Revise segmentação e exclua públicos fracos.");
  if (leads === 0 && spend > 0) notes.push("Sem leads. Valide a oferta e a página de destino.");
  if (leads > 0 && cpl > 0) notes.push(`CPL atual em ${cpl.toFixed(2)}. Busque reduzir 10% no próximo ciclo.`);
  if (notes.length === 0) notes.push("Indicadores equilibrados. Faça otimizações graduais por criativo.");

  return {
    summary: `Análise automática para ${clientName || "cliente"} no relatório ${reportType} (${periodDays} dia(s)).`,
    recommendations: notes.slice(0, 3),
    nextAction: "Revise os 3 maiores gastos e teste 2 variações de criativo."
  };
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

  const clientName = String(body.clientName || "").trim();
  const reportType = String(body.reportType || "basico").trim().toLowerCase();
  const periodDays = Number(body.periodDays || 1);
  const metrics = body.metrics && typeof body.metrics === "object" ? body.metrics : {};
  const apiKey = String(process.env.ANTHROPIC_API_KEY || "").trim();

  if (!apiKey) {
    return json(response, 200, { ok: true, mode: "fallback", advice: fallbackAdvice(metrics, reportType, periodDays, clientName) });
  }

  const prompt = [
    "Você é um analista de mídia paga em português do Brasil.",
    "Responda de forma objetiva e acionável para pequeno negócio.",
    `Cliente: ${clientName || "Não informado"}`,
    `Tipo de relatório: ${reportType}`,
    `Período (dias): ${periodDays}`,
    `Métricas: ${JSON.stringify(metrics)}`,
    "Retorne JSON puro com as chaves: summary, recommendations (array de 3 itens), nextAction."
  ].join("\n");

  try {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 400,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await anthropicResponse.json();
    if (!anthropicResponse.ok) {
      return json(response, 200, {
        ok: true,
        mode: "fallback",
        advice: fallbackAdvice(metrics, reportType, periodDays, clientName),
        claudeError: data
      });
    }

    const text = data?.content?.[0]?.text || "";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (_) {
      parsed = { summary: text || "Claude retornou resposta sem JSON.", recommendations: [], nextAction: "Ajuste o prompt para resposta estruturada." };
    }

    return json(response, 200, { ok: true, mode: "claude", advice: parsed });
  } catch (error) {
    return json(response, 200, {
      ok: true,
      mode: "fallback",
      advice: fallbackAdvice(metrics, reportType, periodDays, clientName),
      detail: error.message
    });
  }
};
