const { getAuthenticatedUser } = require("./_lib/supabase");
const { json, parseJsonBody } = require("./_lib/http");

function firstNameOf(value) {
  return String(value || "Usuario").trim().split(/\s+/)[0] || "Usuario";
}

function getAvailableProviders() {
  return [
    String(process.env.ANTHROPIC_API_KEY || "").trim() ? "anthropic" : null,
    String(process.env.OPENAI_API_KEY || "").trim() ? "openai" : null,
    String(process.env.GEMINI_API_KEY || "").trim() ? "gemini" : null
  ].filter(Boolean);
}

function resolveProvider(requestedProvider) {
  const available = getAvailableProviders();
  const requested = String(requestedProvider || "").trim().toLowerCase();
  if (requested && available.includes(requested)) return requested;
  return available[0] || "fallback";
}

async function callAnthropic(prompt) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || "").trim();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 500,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  return {
    ok: response.ok,
    provider: "anthropic",
    text: data?.content?.[0]?.text || "",
    error: data
  };
}

async function callOpenAI(prompt) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  return {
    ok: response.ok,
    provider: "openai",
    text: data?.choices?.[0]?.message?.content || "",
    error: data
  };
}

async function callGemini(prompt) {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      },
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const data = await response.json();
  return {
    ok: response.ok,
    provider: "gemini",
    text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "",
    error: data
  };
}

async function callProvider(provider, prompt) {
  if (provider === "anthropic") return callAnthropic(prompt);
  if (provider === "openai") return callOpenAI(prompt);
  if (provider === "gemini") return callGemini(prompt);
  return { ok: false, provider: "fallback", text: "", error: { error: "Nenhum provedor configurado." } };
}

function parseStructuredAdvice(text, userName) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return {
      greeting: `${firstNameOf(userName)}, recebi a análise da IA em formato livre.`,
      summary: text || "Resposta sem JSON estruturado.",
      diagnosis: [],
      alerts: [],
      recommendations: [],
      nextAction: "Ajuste o prompt ou troque de provedor."
    };
  }
}

function compactRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 12).map((row) => ({
    campaign: row.campaign_name || row.campaign || "-",
    adset: row.adset_name || row.adset || "-",
    ad: row.ad_name || row.ad || "-",
    spend: Number(row.spend || 0),
    clicks: Number(row.clicks || 0),
    ctr: Number(row.ctr || 0),
    cpc: Number(row.cpc || 0),
    cpm: Number(row.cpm || 0),
    frequency: Number(row.frequency || 0),
    results: Number(row.results || row.result || 0),
    resultType: row.result_type || row.resultType || "-"
  }));
}

function compactCampaignDetail(campaignDetail) {
  if (!campaignDetail || typeof campaignDetail !== "object") return null;
  const items = Array.isArray(campaignDetail.items) ? campaignDetail.items : [];
  return {
    name: campaignDetail.name || "Campanha",
    objective: campaignDetail.objective || "-",
    spend: Number(campaignDetail.spend || 0),
    impressions: Number(campaignDetail.impressions || 0),
    reach: Number(campaignDetail.reach || 0),
    clicks: Number(campaignDetail.clicks || 0),
    linkClicks: Number(campaignDetail.linkClicks || 0),
    results: Number(campaignDetail.results || 0),
    ctr: Number(campaignDetail.ctr || 0),
    cpc: Number(campaignDetail.cpc || 0),
    cpm: Number(campaignDetail.cpm || 0),
    frequency: Number(campaignDetail.frequency || 0),
    items: items.slice(0, 12).map((item) => ({
      label: item.label || "Item",
      spend: Number(item.spend || 0),
      impressions: Number(item.impressions || 0),
      clicks: Number(item.clicks || 0),
      linkClicks: Number(item.linkClicks || 0),
      results: Number(item.results || 0),
      ctr: Number(item.ctr || 0),
      cpc: Number(item.cpc || 0),
      cpm: Number(item.cpm || 0)
    }))
  };
}

function topRowInsights(rows) {
  const compact = compactRows(rows);
  const bySpend = [...compact].sort((a, b) => b.spend - a.spend).slice(0, 3);
  const byResults = [...compact].sort((a, b) => b.results - a.results).slice(0, 3);
  return { bySpend, byResults };
}

function fallbackAdvice(metrics, reportType, periodDays, clientName, userName, question, rows, campaignDetail) {
  const spend = Number(metrics.spend || 0);
  const ctr = Number(metrics.ctr || 0);
  const cpc = Number(metrics.cpc || 0);
  const leads = Number(metrics.leads || 0);
  const cpl = Number(metrics.cpl || 0);
  const diagnosis = [];
  const alerts = [];
  const recommendations = [];
  const userFirstName = firstNameOf(userName);
  const highlighted = topRowInsights(rows);
  const selectedCampaign = compactCampaignDetail(campaignDetail);

  if (spend === 0) alerts.push("Nenhum gasto no período. Confirme se a campanha está ativa e se a conta correta foi selecionada.");
  if (ctr < 1 && spend > 0) diagnosis.push("CTR abaixo do ideal para tráfego pago. Isso sugere desgaste criativo, promessa fraca ou segmentação ampla demais.");
  if (cpc > 3 && spend > 0) diagnosis.push("CPC pressionado. O leilão pode estar caro ou o anúncio não está convertendo clique com eficiência.");
  if (leads === 0 && spend > 0) alerts.push("Houve gasto sem geração de leads. Vale revisar oferta, formulário e página de destino imediatamente.");
  if (leads > 0 && cpl > 0) diagnosis.push(`O CPL atual está em ${cpl.toFixed(2)}. O foco agora é reduzir custo sem derrubar o volume.`);
  if (!diagnosis.length && !alerts.length) diagnosis.push("Os indicadores estão estáveis. O melhor caminho é otimização incremental com teste controlado.");

  if (selectedCampaign) {
    diagnosis.unshift(`Campanha isolada em análise: ${selectedCampaign.name}, com gasto de ${selectedCampaign.spend.toFixed(2)} e ${selectedCampaign.results.toFixed(0)} resultado(s).`);
    if (selectedCampaign.results === 0 && selectedCampaign.spend > 0) {
      alerts.unshift(`A campanha ${selectedCampaign.name} teve gasto sem resultado no período isolado.`);
    }
    recommendations.unshift(`Analise primeiro a campanha ${selectedCampaign.name} isoladamente, comparando os itens internos por gasto, clique e resultado.`);
  }

  recommendations.push("Priorize os anúncios com maior gasto e compare CTR, CPC e resultado antes de escalar verba.");
  if (ctr < 1 && spend > 0) recommendations.push("Teste duas novas variações de criativo com gancho mais forte nos primeiros 3 segundos ou na primeira linha do texto.");
  if (cpc > 3 && spend > 0) recommendations.push("Refine público, remova segmentos fracos e observe se a queda no CPC vem acompanhada de manutenção no volume.");
  if (leads === 0 && spend > 0) recommendations.push("Revise o funil completo: anúncio, oferta, formulário e tempo de resposta comercial.");
  if (highlighted.bySpend.length) {
    recommendations.push(`Olhe primeiro para ${highlighted.bySpend[0].ad} porque ele concentra mais gasto no recorte analisado.`);
  }
  if (question) {
    recommendations.push(`Pergunta priorizada: ${String(question).trim()}. Use essa direção na próxima rodada de otimização.`);
  }

  return {
    greeting: `${userFirstName}, aqui vai uma leitura mais estratégica das métricas de ${clientName || "cliente"}.`,
    summary: `Análise automática para ${clientName || "cliente"} no relatório ${reportType} (${periodDays} dia(s)), com foco em decisão prática e próximos passos${selectedCampaign ? ` e recorte isolado da campanha ${selectedCampaign.name}` : ""}.`,
    diagnosis: diagnosis.slice(0, 3),
    alerts: alerts.slice(0, 3),
    recommendations: recommendations.slice(0, 5),
    nextAction: highlighted.bySpend.length
      ? `Revise hoje os 3 maiores gastos, começando por ${highlighted.bySpend[0].ad}, e teste 2 variações de criativo.`
      : "Revise os 3 maiores gastos e teste 2 variações de criativo."
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
  const userName = String(body.userName || user.email || "Usuario").trim();
  const reportType = String(body.reportType || "basico").trim().toLowerCase();
  const periodDays = Number(body.periodDays || 1);
  const question = String(body.question || "").trim();
  const objectiveSummary = String(body.objectiveSummary || "").trim();
  const metrics = body.metrics && typeof body.metrics === "object" ? body.metrics : {};
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const selectedCampaign = body.selectedCampaign && typeof body.selectedCampaign === "object" ? body.selectedCampaign : null;
  const requestedProvider = String(body.aiProvider || "").trim().toLowerCase();
  const resolvedProvider = resolveProvider(requestedProvider);

  if (resolvedProvider === "fallback") {
    return json(response, 200, {
      ok: true,
      mode: "fallback",
      provider: "fallback",
      availableProviders: getAvailableProviders(),
      advice: fallbackAdvice(metrics, reportType, periodDays, clientName, userName, question, rows, selectedCampaign)
    });
  }

  const rowInsights = topRowInsights(rows);
  const compactSelectedCampaign = compactCampaignDetail(selectedCampaign);

  const prompt = [
    "Você é um analista de mídia paga em português do Brasil.",
    "Responda de forma objetiva, humana e acionável para pequeno negócio.",
    `Você está falando com: ${userName}`,
    "Use o primeiro nome do usuário no greeting, sem exagerar.",
    `Cliente: ${clientName || "Não informado"}`,
    `Tipo de relatório: ${reportType}`,
    `Período (dias): ${periodDays}`,
    `Resumo estratégico atual: ${objectiveSummary || "Não informado"}`,
    `Métricas: ${JSON.stringify(metrics)}`,
    `Linhas detalhadas resumidas: ${JSON.stringify(compactRows(rows))}`,
    `Top gastos: ${JSON.stringify(rowInsights.bySpend)}`,
    `Top resultados: ${JSON.stringify(rowInsights.byResults)}`,
    compactSelectedCampaign ? `Campanha selecionada para análise isolada: ${JSON.stringify(compactSelectedCampaign)}` : "Campanha selecionada para análise isolada: nenhuma.",
    question ? `Pergunta do usuário: ${question}` : "Pergunta do usuário: nenhuma. Gere análise proativa.",
    "Cruze métricas agregadas com os dados detalhados antes de recomendar mudanças.",
    compactSelectedCampaign ? "Dê prioridade analítica à campanha selecionada e cite o nome dela explicitamente na resposta." : "Se não houver campanha isolada, analise o conjunto geral.",
    "Se houver sinais de risco, deixe isso explícito.",
    "Retorne JSON puro com as chaves: greeting, summary, diagnosis (array com até 3 itens), alerts (array com até 3 itens), recommendations (array de 3 a 5 itens), nextAction."
  ].join("\n");

  try {
    const providerResponse = await callProvider(resolvedProvider, prompt);
    if (!providerResponse.ok) {
      return json(response, 200, {
        ok: true,
        mode: "fallback",
        provider: resolvedProvider,
        availableProviders: getAvailableProviders(),
        advice: fallbackAdvice(metrics, reportType, periodDays, clientName, userName, question, rows, selectedCampaign),
        providerError: providerResponse.error
      });
    }

    return json(response, 200, {
      ok: true,
      mode: resolvedProvider,
      provider: resolvedProvider,
      availableProviders: getAvailableProviders(),
      advice: parseStructuredAdvice(providerResponse.text, userName)
    });
  } catch (error) {
    return json(response, 200, {
      ok: true,
      mode: "fallback",
      provider: resolvedProvider,
      availableProviders: getAvailableProviders(),
      advice: fallbackAdvice(metrics, reportType, periodDays, clientName, userName, question, rows, selectedCampaign),
      detail: error.message
    });
  }
};
