// Facebook Login e listagem de contas de anúncio
let fbSdkEnabled = false;
let fbSdkPromise = null;

function setFbButtonState(disabled, label = "Entrar com Facebook") {
  const fbBtn = document.getElementById("fbLoginBtn");
  if (!fbBtn) return;
  fbBtn.disabled = disabled;
  fbBtn.textContent = label;
}

function loadFacebookSdk() {
  if (window.FB) return Promise.resolve(window.FB);
  if (fbSdkPromise) return fbSdkPromise;

  fbSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://connect.facebook.net/pt_BR/sdk.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.FB));
      existing.addEventListener("error", () => reject(new Error("Nao foi possivel carregar o SDK do Facebook.")));
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/pt_BR/sdk.js";
    script.onload = () => resolve(window.FB);
    script.onerror = () => reject(new Error("Nao foi possivel carregar o SDK do Facebook."));
    document.head.appendChild(script);
  });

  return fbSdkPromise;
}

async function initFacebookLogin(publicConfig = {}) {
  const appId = String(publicConfig.metaAppId || "").trim();
  const apiVersion = /^v\d+\.\d+$/.test(String(publicConfig.metaApiVersion || ""))
    ? String(publicConfig.metaApiVersion)
    : "v25.0";

  if (!appId) {
    fbSdkEnabled = false;
    setFbButtonState(true, "Facebook nao configurado");
    updateFbStatus("Login com Facebook e opcional. Configure META_APP_ID na Vercel para habilitar.", "warn");
    return;
  }

  setFbButtonState(true, "Conectando...");

  try {
    await loadFacebookSdk();
    window.FB.init({
      appId,
      cookie: true,
      xfbml: true,
      version: apiVersion
    });
    fbSdkEnabled = true;
    setFbButtonState(false);
    updateFbStatus("Facebook pronto para login.", "ok");
  } catch (error) {
    fbSdkEnabled = false;
    setFbButtonState(true, "Facebook indisponivel");
    updateFbStatus(error.message || "Nao foi possivel iniciar o login com Facebook.", "warn");
  }
}

function showFbPanel() {
  const panel = document.getElementById('fbPanel');
  if (panel) panel.style.display = 'block';
}

function updateFbStatus(msg, kind = '') {
  const el = document.getElementById('fbStatus');
  if (!el) return;
  el.className = 'status' + (kind ? ' ' + kind : '');
  el.textContent = msg;
}

function listFbAdAccounts() {
  updateFbStatus('Buscando contas de anúncio...');
  FB.api('/me', 'GET', { fields: 'adaccounts{name}' }, function(response) {
    if (response && !response.error && response.adaccounts) {
      const list = document.getElementById('fbAccountsList');
      const box = document.getElementById('fbAccountsBox');
      if (box) box.style.display = 'block';
      if (list) {
        list.innerHTML = '';
        response.adaccounts.data.forEach(acc => {
          const li = document.createElement('li');
          li.textContent = `${acc.name} (ID: ${acc.id})`;
          list.appendChild(li);
        });
      }
      updateFbStatus('Contas carregadas!', 'ok');
    } else {
      updateFbStatus('Erro ao buscar contas: ' + (response.error?.message || 'desconhecido'), 'err');
    }
  });
}

function fbLoginAndList() {
  if (!fbSdkEnabled || !window.FB) {
    updateFbStatus("Login com Facebook indisponivel. Configure META_APP_ID ou use o token manualmente.", "warn");
    return;
  }
  updateFbStatus('Conectando ao Facebook...');
  FB.login(function(response) {
    if (response.authResponse) {
      updateFbStatus('Login realizado! Buscando contas...','ok');
      listFbAdAccounts();
    } else {
      updateFbStatus('Login cancelado ou não autorizado.','warn');
    }
  }, { scope: 'ads_read,ads_management,business_management' });
}

document.addEventListener('DOMContentLoaded', function() {
  const fbBtn = document.getElementById('fbLoginBtn');
  if (fbBtn) fbBtn.onclick = fbLoginAndList;
  setFbButtonState(true, "Facebook nao configurado");
  // Exibe o painel Facebook logo ao carregar (ou ajuste para exibir sob demanda)
  showFbPanel();
});
(function () {
let supabase = null;
let currentUser = null;
let selectedPeriodDays = 1;
let lastMetricsPayload = null;
let metricsHistory = [];

const entryScreenEl = document.getElementById("entryScreen");
const signupCardEl = document.getElementById("signupCard");
const loginCardEl = document.getElementById("loginCard");
const recoverScreenEl = document.getElementById("recoverScreen");
const resetScreenEl = document.getElementById("resetScreen");
const metricsAppEl = document.getElementById("metricsApp");
const clientViewScreenEl = document.getElementById("clientViewScreen");

const entryStatusEl = document.getElementById("entryStatus");
const entryNextStepEl = document.getElementById("entryNextStep");
const statusEl = document.getElementById("status");
const mainNextStepEl = document.getElementById("mainNextStep");
const authStatusEl = document.getElementById("authStatus");
const tokenStatusEl = document.getElementById("tokenStatus");
const displayNameInputEl = document.getElementById("displayNameInput");
const saveDisplayNameBtnEl = document.getElementById("saveDisplayNameBtn");
const displayNameEditorEl = document.getElementById("displayNameEditor");
const editDisplayNameBtnEl = document.getElementById("editDisplayNameBtn");
const addLinkedAccountsBtnEl = document.getElementById("addLinkedAccountsBtn");
const linkedAccountsBoxEl = document.getElementById("linkedAccountsBox");
const linkedAccountsToggleBtnEl = document.getElementById("linkedAccountsToggleBtn");
const linkedAccountsMenuEl = document.getElementById("linkedAccountsMenu");
const linkedAccountsSearchEl = document.getElementById("linkedAccountsSearch");
const linkedAccountsListEl = document.getElementById("linkedAccountsList");

const signupEmailEl = document.getElementById("signupEmail");
const signupDocumentEl = document.getElementById("signupDocument");
const signupPasswordEl = document.getElementById("signupPassword");
const signupConfirmEl = document.getElementById("signupConfirm");
const signupRulesEl = document.getElementById("signupRules");
const signupStrengthMeterEl = document.getElementById("signupStrengthMeter");
const signupPolicyEl = document.getElementById("signupPolicy");
const loginEmailEl = document.getElementById("loginEmail");
const loginPasswordEl = document.getElementById("loginPassword");
const recoverEmailEl = document.getElementById("recoverEmail");
const resetPasswordEl = document.getElementById("resetPassword");
const resetConfirmEl = document.getElementById("resetConfirm");
const resetRulesEl = document.getElementById("resetRules");
const resetStrengthMeterEl = document.getElementById("resetStrengthMeter");
const resetPolicyEl = document.getElementById("resetPolicy");
const metricsRemoveBoxEl = document.getElementById("metricsRemoveBox");
const metricsRemoveToggleBtnEl = document.getElementById("metricsRemoveToggleBtn");
const metricsRemoveMenuEl = document.getElementById("metricsRemoveMenu");
const metricsRemoveSearchEl = document.getElementById("metricsRemoveSearch");
const metricsRemoveListEl = document.getElementById("metricsRemoveList");
const metricsRemoveSelectEl = document.getElementById("metricsRemoveSelect");
const removeMetricsSelectedBtnEl = document.getElementById("removeMetricsSelectedBtn");
const metricsClientHintEl = document.getElementById("metricsClientHint");
const doLoginBtnEl = document.getElementById("doLoginBtn");
const openPanelBtnEl = document.getElementById("openPanelBtn");

const metaTokenEl = document.getElementById("metaToken");
const tokenToggleBtnEl = document.getElementById("tokenToggleBtn");
const tokenFormEl = document.getElementById("tokenForm");
const availableAccountSelectEl = document.getElementById("availableAccountSelect");
const metricsClientSelectEl = document.getElementById("metricsClientSelect");
const clientSelectEl = document.getElementById("clientSelect");
const clientNameEl = document.getElementById("clientName");
const adAccountIdEl = document.getElementById("adAccountId");
const apiVersionEl = document.getElementById("apiVersion");
const reportTypeEl = document.getElementById("reportType");
const tableBodyEl = document.getElementById("tableBody");
const adviceEl = document.getElementById("advice");
const rawOutputEl = document.getElementById("rawOutput");

const kSpendEl = document.getElementById("kSpend");
const kClicksEl = document.getElementById("kClicks");
const kLeadsEl = document.getElementById("kLeads");
const kCtrEl = document.getElementById("kCtr");
const kCpcEl = document.getElementById("kCpc");
const kCplEl = document.getElementById("kCpl");
const kLinkCtrEl = document.getElementById("kLinkCtr");
const kCpmEl = document.getElementById("kCpm");
const kMsgStart7dEl = document.getElementById("kMsgStart7d");
const kReachEl = document.getElementById("kReach");
const kImpressionsEl = document.getElementById("kImpressions");
const kFrequencyEl = document.getElementById("kFrequency");
const kResultsEl = document.getElementById("kResults");
const kResultTypeEl = document.getElementById("kResultType");
const kDailySpendEl = document.getElementById("kDailySpend");
const objectiveSummaryEl = document.getElementById("objectiveSummary");
const advancedMetricsEl = document.getElementById("advancedMetrics");
const agencyPresetPreviewEl = document.getElementById("agencyPresetPreview");
const stageBarsEl = document.getElementById("stageBars");
const topAdsListEl = document.getElementById("topAdsList");
const cvTitleEl = document.getElementById("cvTitle");
const cvSubtitleEl = document.getElementById("cvSubtitle");
const cvIndicatorsEl = document.getElementById("cvIndicators");
const cvObjectiveEl = document.getElementById("cvObjective");
const cvStagesEl = document.getElementById("cvStages");
const cvTopAdsEl = document.getElementById("cvTopAds");
const panelConfigEl = document.getElementById("panelConfig");
const metricsScreenEl = document.getElementById("metricsScreen");

function brMoney(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function brInt(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeResultType(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("lead")) return "Lead";
  if (t.includes("purchase")) return "Compra";
  if (t.includes("message")) return "Mensagem";
  if (t.includes("contact_total")) return "Contato";
  if (t.includes("registration")) return "Cadastro";
  if (t.includes("checkout")) return "Checkout";
  if (t.includes("add_to_cart")) return "Carrinho";
  if (t.includes("link_click")) return "Clique no link";
  return type || "-";
}

function toPercent(value) {
  return `${Number(value || 0).toFixed(2).replace(".", ",")}%`;
}

const AGENCY_METRICS_PRESET = [
  { key: "spend", label: "Gasto", type: "money", group: "Core" },
  { key: "impressions", label: "Impressões", type: "int", group: "Core" },
  { key: "reach", label: "Alcance", type: "int", group: "Core" },
  { key: "frequency", label: "Frequência", type: "decimal", group: "Core" },
  { key: "link_clicks", label: "Cliques no link", type: "int", group: "Core" },
  { key: "link_ctr", label: "CTR (link)", type: "percent", group: "Core" },
  { key: "link_cpc", label: "CPC (link)", type: "money", group: "Core" },
  { key: "cpm", label: "CPM", type: "money", group: "Core" },
  { key: "landing_page_views", label: "Landing Page Views", type: "int", group: "Conversão" },
  { key: "cost_per_lpv", label: "Custo por LPV", type: "money", group: "Conversão" },
  { key: "leads", label: "Leads", type: "int", group: "Conversão" },
  { key: "cpl", label: "CPL", type: "money", group: "Conversão" },
  { key: "messages_started", label: "Mensagens iniciadas", type: "int", group: "Conversão" },
  { key: "cost_per_message", label: "Custo por conversa", type: "money", group: "Conversão" },
  { key: "add_to_cart", label: "Add to Cart", type: "int", group: "Conversão" },
  { key: "initiate_checkout", label: "Initiate Checkout", type: "int", group: "Conversão" },
  { key: "purchase", label: "Purchases", type: "int", group: "Resultado" },
  { key: "cpa", label: "CPA (compra)", type: "money", group: "Resultado" },
  { key: "conversion_value", label: "Valor de conversão", type: "money", group: "Resultado" },
  { key: "purchase_roas", label: "ROAS", type: "decimal", group: "Resultado" }
];

function formatAgencyMetricValue(type, value) {
  if (value === null || value === undefined || value === "") return "-";
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "-";
  if (type === "money") return brMoney(numberValue);
  if (type === "int") return brInt(numberValue);
  if (type === "percent") return toPercent(numberValue);
  return numberValue.toFixed(2).replace(".", ",");
}

function getAgencyPresetMetricMap(summary = {}) {
  const advanced = summary.advanced || {};
  const spend = Number(summary.spend || 0);
  const lpv = Number(advanced.landing_page_view || 0);
  const messageStarts = Number(advanced.messaging_conversation_started_7d || 0);
  const purchases = Number(advanced.purchase || 0);
  const purchaseRoas = Number(advanced.purchase_roas || 0);
  const conversionValue = Number(summary.purchase_conversion_value || advanced.purchase_conversion_value || 0);

  return {
    spend,
    impressions: Number(summary.impressions || 0),
    reach: Number(summary.reach || 0),
    frequency: Number(summary.frequency || 0),
    link_clicks: Number(advanced.link_clicks || 0),
    link_ctr: Number(advanced.link_ctr || 0),
    link_cpc: Number(advanced.link_cpc || 0),
    cpm: Number(summary.cpm || 0),
    landing_page_views: lpv,
    cost_per_lpv: lpv > 0 ? spend / lpv : null,
    leads: Number(summary.leads || 0),
    cpl: Number(summary.cpl || 0),
    messages_started: messageStarts,
    cost_per_message: messageStarts > 0 ? spend / messageStarts : null,
    add_to_cart: Number(advanced.add_to_cart || 0),
    initiate_checkout: Number(advanced.initiate_checkout || 0),
    purchase: purchases,
    cpa: purchases > 0 ? spend / purchases : null,
    conversion_value: conversionValue > 0 ? conversionValue : null,
    purchase_roas: purchaseRoas
  };
}

function renderAgencyPresetPreview(summary = null) {
  if (!agencyPresetPreviewEl) return;
  if (!summary || Object.keys(summary).length === 0) {
    agencyPresetPreviewEl.textContent = "Carregue as métricas para visualizar o padrão agência com 20 indicadores.";
    return;
  }

  const values = getAgencyPresetMetricMap(summary);
  const groups = ["Core", "Conversão", "Resultado"];
  const html = groups
    .map((group) => {
      const items = AGENCY_METRICS_PRESET
        .filter((metric) => metric.group === group)
        .map((metric) => {
          const display = formatAgencyMetricValue(metric.type, values[metric.key]);
          return `<li style="display:flex; justify-content:space-between; gap:10px; padding:4px 0; border-bottom:1px dashed #deebf5;"><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(display)}</strong></li>`;
        })
        .join("");
      return `
        <div style="border:1px solid #deebf5; border-radius:10px; padding:8px 10px; background:#ffffff; margin-bottom:8px;">
          <div style="font-size:0.78rem; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:#2b577c; margin-bottom:6px;">${group}</div>
          <ul style="list-style:none; margin:0; padding:0;">${items}</ul>
        </div>
      `;
    })
    .join("");

  agencyPresetPreviewEl.innerHTML = html;
}

function renderAdvancedMetrics(summary = {}) {
  if (!advancedMetricsEl) return;
  const advanced = summary.advanced || {};
  const lines = [
    `Cliques no link: ${brInt(advanced.link_clicks || 0)} | Cliques de saída: ${brInt(advanced.outbound_clicks || 0)} | Cliques únicos link: ${brInt(advanced.unique_link_clicks || 0)}`,
    `Conversas 7d: ${brInt(advanced.messaging_conversation_started_7d || 0)} | Primeira resposta: ${brInt(advanced.messaging_first_reply || 0)} | Contatos: ${brInt(advanced.contact_total || 0)}`,
    `Compras: ${brInt(advanced.purchase || 0)} | Checkout: ${brInt(advanced.initiate_checkout || 0)} | Carrinho: ${brInt(advanced.add_to_cart || 0)} | Cadastro: ${brInt(advanced.complete_registration || 0)}`,
    `CTR link: ${toPercent(advanced.link_ctr || 0)} | CPC link: ${brMoney(advanced.link_cpc || 0)} | Taxa clique->lead: ${toPercent(advanced.click_to_lead_rate || 0)} | ROAS compra: ${(Number(advanced.purchase_roas || 0)).toFixed(2).replace(".", ",")}`,
    `Foco da agência: ${normalizeResultType(summary.focus_action_type || "-")} = ${brInt(summary.focus_results || 0)} | Custo por foco: ${brMoney(summary.focus_cost || 0)}`
  ];
  advancedMetricsEl.textContent = lines.join("\n");
}

function parseDateISO(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calcPeriodDays(dateStart, dateEnd) {
  const start = parseDateISO(dateStart);
  const end = parseDateISO(dateEnd);
  if (!start || !end) return 1;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return 1;
  return Math.max(1, Math.floor(diffMs / 86400000) + 1);
}

function detectFunnelStage(row) {
  const text = [row.campaign_name, row.adset_name, row.ad_name]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  if (/(remarketing|retarget|remarket|reimpacto)/.test(text)) {
    return { key: "etapa3", label: "Etapa 3 - remarketing" };
  }
  if (/(lead|cadastro|formulario|whatsapp|conversa|mensagem|contato)/.test(text)) {
    return { key: "etapa2", label: "Etapa 2 - captura" };
  }
  return { key: "etapa1", label: "Etapa 1 - engajamento" };
}

function computeExecutiveMetrics(rows, summary, periodDays) {
  const hasFocus = Boolean(summary && summary.focus_action_type);
  let totalResults = Number(summary.total_results || 0);
  let dominantResultType = summary.result_type || "-";
  let dominantResultValue = totalResults;

  if (!hasFocus) {
    const resultByType = {};
    rows.forEach((row) => {
      const type = row.result_type || "-";
      const value = Number(row.results || 0);
      resultByType[type] = (resultByType[type] || 0) + value;
    });
    dominantResultType = summary.result_type || "-";
    dominantResultValue = 0;
    Object.entries(resultByType).forEach(([type, value]) => {
      if (value > dominantResultValue) {
        dominantResultValue = value;
        dominantResultType = type;
      }
    });
    totalResults = Number(summary.total_results || dominantResultValue || 0);
  }

  const reach = Number(summary.reach || 0);
  const impressions = Number(summary.impressions || 0);
  const frequency = reach > 0 ? impressions / reach : 0;
  const dailySpend = Number(summary.spend || 0) / Math.max(1, periodDays);

  return {
    reach,
    impressions,
    frequency,
    dailySpend,
    totalResults,
    dominantResultType,
    dominantResultValue
  };
}

function updateExecutiveBlocks(rows, summary, context = {}, dateStart, dateEnd) {
  const periodDays = calcPeriodDays(dateStart || context.since, dateEnd || context.until);
  const exec = computeExecutiveMetrics(rows, summary, periodDays);

  kReachEl.textContent = brInt(exec.reach);
  kImpressionsEl.textContent = brInt(exec.impressions);
  kFrequencyEl.textContent = Number(exec.frequency).toFixed(2).replace(".", ",");
  kResultsEl.textContent = brInt(exec.totalResults);
  kResultTypeEl.textContent = normalizeResultType(exec.dominantResultType);
  kDailySpendEl.textContent = brMoney(exec.dailySpend);

  const objectiveText = `Período analisado: ${periodDays} dia(s). Foco principal em ${normalizeResultType(exec.dominantResultType)} com ${brInt(exec.totalResults)} resultado(s). Público atingido: ${brInt(exec.reach)} e ${brInt(exec.impressions)} impressões.`;
  objectiveSummaryEl.textContent = objectiveText;

  const stageAgg = {
    etapa1: { label: "Etapa 1 - engajamento", spend: 0, results: 0 },
    etapa2: { label: "Etapa 2 - captura", spend: 0, results: 0 },
    etapa3: { label: "Etapa 3 - remarketing", spend: 0, results: 0 }
  };

  rows.forEach((row) => {
    const stage = detectFunnelStage(row);
    stageAgg[stage.key].spend += Number(row.spend || 0);
    stageAgg[stage.key].results += Number(row.results || row.leads || 0);
  });

  const totalSpend = Math.max(0.0001, Number(summary.spend || 0));
  stageBarsEl.innerHTML = Object.values(stageAgg)
    .map((item) => {
      const pct = (item.spend / totalSpend) * 100;
      return `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.86rem; margin-bottom:4px;">
            <span>${item.label}</span>
            <span>${pct.toFixed(1).replace(".", ",")}% | Resultados: ${brInt(item.results)}</span>
          </div>
          <div style="width:100%; height:10px; background:#edf2f7; border-radius:999px; overflow:hidden;">
            <div style="width:${Math.min(100, Math.max(0, pct))}%; height:100%; background:#0f6ea8;"></div>
          </div>
        </div>
      `;
    })
    .join("");

  const topAds = [...rows]
    .filter((row) => row.ad_name && row.ad_name !== "-")
    .sort((a, b) => Number(b.results || b.leads || 0) - Number(a.results || a.leads || 0) || Number(b.spend || 0) - Number(a.spend || 0))
    .slice(0, 6);

  topAdsListEl.innerHTML = topAds.length
    ? topAds
        .map((row) => `<li>${row.ad_name} - ${brInt(row.results || row.leads || 0)} (${normalizeResultType(row.result_type)})</li>`)
        .join("")
    : "<li>Sem anúncios detalhados no período. Selecione o tipo Detalhado para ranking de anúncios.</li>";
}

function getClientViewIndicators() {
  return [
    ["Gasto total", kSpendEl.textContent],
    ["Investimento diário", kDailySpendEl.textContent],
    ["Público atingido", kReachEl.textContent],
    ["Impressões", kImpressionsEl.textContent],
    ["Cliques", kClicksEl.textContent],
    ["Leads", kLeadsEl.textContent],
    ["CTR", kCtrEl.textContent],
    ["CTR link", kLinkCtrEl.textContent],
    ["CPC", kCpcEl.textContent],
    ["CPM", kCpmEl.textContent],
    ["CPL", kCplEl.textContent],
    ["Conversas 7d", kMsgStart7dEl.textContent],
    ["Frequência", kFrequencyEl.textContent],
    ["Resultado principal", kResultsEl.textContent],
    ["Tipo de resultado", kResultTypeEl.textContent]
  ];
}

function renderClientView() {
  if (!lastMetricsPayload) {
    return false;
  }

  const clientName = lastMetricsPayload.clientName || "Cliente";
  const periodLabel = `${lastMetricsPayload.dateStart || "-"} até ${lastMetricsPayload.dateEnd || "-"}`;
  cvTitleEl.textContent = `Relatório Executivo - ${clientName}`;
  cvSubtitleEl.textContent = `Período: ${periodLabel} | Tipo: ${lastMetricsPayload.reportType || "-"}`;

  cvIndicatorsEl.innerHTML = getClientViewIndicators()
    .map(([label, value]) => `
      <div class="client-card">
        <div class="k">${escapeHtml(label)}</div>
        <div class="v">${escapeHtml(value)}</div>
      </div>
    `)
    .join("");

  cvObjectiveEl.textContent = objectiveSummaryEl.textContent || "Sem dados.";
  cvStagesEl.innerHTML = stageBarsEl.innerHTML || "Sem dados.";
  cvTopAdsEl.innerHTML = topAdsListEl.innerHTML || "<li>Sem dados.</li>";
  return true;
}

function openClientView() {
  if (!renderClientView()) {
    setStatus("warn", "Atualize métricas antes de abrir a visão cliente.");
    return;
  }
  metricsAppEl.classList.add("hidden");
  clientViewScreenEl.classList.remove("hidden");
}

function closeClientView() {
  clientViewScreenEl.classList.add("hidden");
  metricsAppEl.classList.remove("hidden");
}

function setStatus(kind, message) {
  statusEl.className = "status";
  if (kind) statusEl.classList.add(kind);
  statusEl.textContent = message;
}

function setEntryStatus(kind, message) {
  if (!entryStatusEl) return;
  if (!message) {
    entryStatusEl.className = "status hidden";
    entryStatusEl.textContent = "";
    return;
  }
  entryStatusEl.className = "status";
  if (kind) entryStatusEl.classList.add(kind);
  entryStatusEl.textContent = message;
}

function setMainNextStep(message) {
  mainNextStepEl.textContent = `Proximo passo: ${message}`;
}

function setEntryNextStep(message) {
  if (!entryNextStepEl) return;
  entryNextStepEl.textContent = "";
  entryNextStepEl.classList.add("hidden");
}

function setAuthStatus(message) {
  const name = String(message || "Usuario").trim() || "Usuario";
  authStatusEl.className = "greeting";
  authStatusEl.innerHTML = `Ola, <span class="name">${escapeHtml(name)}</span>`;
}

function setDisplayNameEditMode(editing) {
  if (displayNameEditorEl) displayNameEditorEl.classList.toggle("hidden", !editing);
  if (editDisplayNameBtnEl) editDisplayNameBtnEl.classList.toggle("hidden", editing);
}

function getDisplayNameStorageKey(user) {
  const id = String(user?.id || user?.email || "anon");
  return `panelDisplayName:${id}`;
}

function getDefaultPanelName(user) {
  const email = String(user?.email || "").trim().toLowerCase();
  if (email.includes("@")) {
    const base = email.split("@")[0] || "Usuario";
    return base.replace(/[._-]+/g, " ").trim() || "Usuario";
  }
  return "Usuario";
}

function getPanelName(user) {
  if (!user) return "Painel";
  try {
    const saved = localStorage.getItem(getDisplayNameStorageKey(user));
    if (saved && saved.trim()) return saved.trim();
  } catch (_) {
    // Ignora falha de storage.
  }
  return getDefaultPanelName(user);
}

function hasSavedPanelName(user) {
  if (!user) return false;
  try {
    const saved = localStorage.getItem(getDisplayNameStorageKey(user));
    return Boolean(saved && saved.trim());
  } catch (_) {
    return false;
  }
}

function savePanelName() {
  if (!currentUser || !displayNameInputEl) return;
  const value = String(displayNameInputEl.value || "").trim();
  const finalName = value || getDefaultPanelName(currentUser);
  try {
    localStorage.setItem(getDisplayNameStorageKey(currentUser), finalName);
  } catch (_) {
    // Ignora falha de storage.
  }
  if (displayNameInputEl) displayNameInputEl.value = finalName;
  setAuthStatus(finalName);
  setDisplayNameEditMode(false);
}

function setTokenStatus(kind, message) {
  tokenStatusEl.className = "status";
  if (kind) tokenStatusEl.classList.add(kind);
  tokenStatusEl.textContent = message;
}

function clearAvailableAccounts() {
  availableAccountSelectEl.innerHTML = "";
  renderLinkedAccountsList();
  updateLinkedAccountsToggleText();
}

function getSelectedLinkedAccountsCount() {
  return Array.from(availableAccountSelectEl.selectedOptions || []).filter((option) => option.value).length;
}

function updateLinkedAccountsToggleText() {
  if (!linkedAccountsToggleBtnEl) return;
  const total = availableAccountSelectEl.options.length;
  const selectedCount = getSelectedLinkedAccountsCount();
  if (!total) {
    linkedAccountsToggleBtnEl.textContent = "Nenhuma conta encontrada";
    return;
  }
  linkedAccountsToggleBtnEl.textContent = selectedCount > 0
    ? `${selectedCount} conta(s) selecionada(s)`
    : "Selecionar contas...";
}

function getSelectedMetricsRemoveCount() {
  if (!metricsRemoveSelectEl) return 0;
  return Array.from(metricsRemoveSelectEl.selectedOptions || []).filter((option) => option.value).length;
}

function updateMetricsRemoveToggleText() {
  if (!metricsRemoveToggleBtnEl || !metricsRemoveSelectEl) return;
  const total = Array.from(metricsRemoveSelectEl.options || []).filter((option) => option.value).length;
  const selectedCount = getSelectedMetricsRemoveCount();
  if (!total) {
    metricsRemoveToggleBtnEl.textContent = "Nenhum cliente disponível";
    if (metricsClientHintEl) metricsClientHintEl.textContent = "Nenhum cliente salvo para remover.";
    if (removeMetricsSelectedBtnEl) removeMetricsSelectedBtnEl.disabled = true;
    return;
  }
  metricsRemoveToggleBtnEl.textContent = selectedCount > 0
    ? `${selectedCount} cliente(s) selecionado(s)`
    : "Selecionar clientes para remover...";
  if (metricsClientHintEl) {
    metricsClientHintEl.textContent = selectedCount > 0
      ? "Clientes selecionados prontos para remover."
      : "Selecione um ou mais clientes para remover.";
  }
  if (removeMetricsSelectedBtnEl) removeMetricsSelectedBtnEl.disabled = selectedCount === 0;
}

function renderMetricsRemoveList(filterText = "") {
  if (!metricsRemoveListEl || !metricsRemoveSelectEl) return;
  const query = String(filterText || "").trim().toLowerCase();
  metricsRemoveListEl.innerHTML = "";

  const options = Array.from(metricsRemoveSelectEl.options || []).filter((option) => option.value);
  const filtered = query
    ? options.filter((option) => String(option.textContent || "").toLowerCase().includes(query))
    : options;

  if (filtered.length === 0) {
    metricsRemoveListEl.innerHTML = '<div class="hint" style="margin:0;">Nenhum cliente para este filtro.</div>';
    return;
  }

  filtered.forEach((option) => {
    const label = document.createElement("label");
    label.className = "multi-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = option.selected;
    checkbox.addEventListener("change", () => {
      option.selected = checkbox.checked;
      updateMetricsRemoveToggleText();
    });

    const text = document.createElement("span");
    text.textContent = option.textContent || "Cliente";

    label.appendChild(checkbox);
    label.appendChild(text);
    metricsRemoveListEl.appendChild(label);
  });
}

function syncMetricsRemoveOptions() {
  if (!metricsRemoveSelectEl || !metricsClientSelectEl) return;
  const selected = new Set(Array.from(metricsRemoveSelectEl.selectedOptions || []).map((option) => option.value));
  metricsRemoveSelectEl.innerHTML = "";
  Array.from(metricsClientSelectEl.options || []).forEach((option) => {
    if (!option.value) return;
    const clone = option.cloneNode(true);
    if (selected.has(clone.value)) clone.selected = true;
    metricsRemoveSelectEl.appendChild(clone);
  });
  renderMetricsRemoveList(metricsRemoveSearchEl ? metricsRemoveSearchEl.value : "");
  updateMetricsRemoveToggleText();
}

function closeMetricsRemoveMenu() {
  if (!metricsRemoveMenuEl) return;
  metricsRemoveMenuEl.classList.add("hidden");
}

function maybeCloseMetricsRemoveMenu(target) {
  if (!metricsRemoveBoxEl || !metricsRemoveMenuEl) return;
  if (metricsRemoveMenuEl.classList.contains("hidden")) return;
  if (metricsRemoveBoxEl.contains(target)) return;
  closeMetricsRemoveMenu();
}

function renderLinkedAccountsList(filterText = "") {
  if (!linkedAccountsListEl) return;
  const query = String(filterText || "").trim().toLowerCase();
  linkedAccountsListEl.innerHTML = "";

  const options = Array.from(availableAccountSelectEl.options || []);
  const filtered = query
    ? options.filter((option) => String(option.textContent || "").toLowerCase().includes(query))
    : options;

  if (filtered.length === 0) {
    linkedAccountsListEl.innerHTML = '<div class="hint" style="margin:0;">Nenhuma conta para este filtro.</div>';
    return;
  }

  filtered.forEach((option) => {
    const label = document.createElement("label");
    label.className = "multi-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = option.selected;
    checkbox.addEventListener("change", () => {
      option.selected = checkbox.checked;
      updateLinkedAccountsToggleText();
      availableAccountSelectEl.dispatchEvent(new Event("change"));
    });

    const text = document.createElement("span");
    text.textContent = option.textContent || "Conta";

    label.appendChild(checkbox);
    label.appendChild(text);
    linkedAccountsListEl.appendChild(label);
  });
}

function renderAvailableAccounts(accounts) {
  const selected = new Set(Array.from(availableAccountSelectEl.selectedOptions || []).map((option) => option.value));
  clearAvailableAccounts();
  accounts.forEach((account) => {
    const option = document.createElement("option");
    const numericId = String(account.accountId || account.id || "").trim();
    const accountName = String(account.name || "Conta Meta").trim();
    option.value = numericId;
    option.textContent = `${accountName} - ${numericId}`;
    option.dataset.name = accountName;
    option.dataset.account = numericId;
    option.dataset.apiVersion = apiVersionEl.value.trim() || "v25.0";
    if (selected.has(numericId)) option.selected = true;
    availableAccountSelectEl.appendChild(option);
  });
  renderLinkedAccountsList(linkedAccountsSearchEl ? linkedAccountsSearchEl.value : "");
  updateLinkedAccountsToggleText();
}

function closeLinkedAccountsMenu() {
  if (!linkedAccountsMenuEl) return;
  linkedAccountsMenuEl.classList.add("hidden");
}

function maybeCloseLinkedAccountsMenu(target) {
  if (!linkedAccountsBoxEl || !linkedAccountsMenuEl) return;
  if (linkedAccountsMenuEl.classList.contains("hidden")) return;
  if (linkedAccountsBoxEl.contains(target)) return;
  closeLinkedAccountsMenu();
}

async function loadAvailableAccounts() {
  const result = await apiPost("/api/user-token", { action: "accounts", apiVersion: apiVersionEl.value.trim() || "v25.0" });
  if (!result.ok) {
    clearAvailableAccounts();
    setStatus("warn", "Nao foi possivel listar contas do token agora.");
    return;
  }
  const accounts = result.data.accounts || [];
  renderAvailableAccounts(accounts);
  if (accounts.length === 0) {
    setMainNextStep("token validado, mas nenhuma conta vinculada foi encontrada.");
    return;
  }
  setMainNextStep("selecione uma ou mais contas vinculadas e clique em Adicionar selecionadas.");
}

function showOnly(screen) {
  [entryScreenEl, recoverScreenEl, resetScreenEl, metricsAppEl, clientViewScreenEl].forEach((el) => el.classList.add("hidden"));
  screen.classList.remove("hidden");
  screen.classList.remove("screen-enter");
  void screen.offsetWidth;
  screen.classList.add("screen-enter");
}

function toggleAuthCard(card, show) {
  if (!card) return;
  card.classList.toggle("hidden", !show);
  if (show) {
    card.classList.remove("card-enter");
    void card.offsetWidth;
    card.classList.add("card-enter");
  }
}

function setLoginButtonLoading(loading) {
  if (!doLoginBtnEl) return;
  doLoginBtnEl.disabled = loading;
}

function setSignupMode(active) {
  toggleAuthCard(signupCardEl, active);
  if (loginCardEl) loginCardEl.classList.toggle("hidden", active);
  const recoverBtn = document.getElementById("openRecoverBtn");
  const entryCta = document.querySelector(".entry-cta");
  if (recoverBtn) recoverBtn.classList.toggle("hidden", active);
  if (entryCta) entryCta.classList.toggle("hidden", active);
}

function openMetricsScreen() {
  if (!metricsAppEl) return;
  metricsAppEl.classList.add("metrics-screen");
  metricsAppEl.classList.remove("panel-screen");
}

function openPanelScreen() {
  if (!metricsAppEl) return;
  metricsAppEl.classList.add("panel-screen");
  metricsAppEl.classList.remove("metrics-screen");
}

function getPasswordChecks(password) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    noSpaces: !/\s/.test(password)
  };
}

function validateStrongPassword(password) {
  const checks = getPasswordChecks(password);
  const issues = [];
  if (!checks.length) issues.push("minimo de 8 caracteres");
  if (!checks.upper) issues.push("1 letra maiuscula");
  if (!checks.lower) issues.push("1 letra minuscula");
  if (!checks.number) issues.push("1 numero");
  if (!checks.symbol) issues.push("1 simbolo");
  if (!checks.noSpaces) issues.push("sem espacos");
  return { ok: issues.length === 0, issues };
}

function renderPasswordRules(listEl, checks) {
  if (!listEl) return;
  listEl.querySelectorAll("[data-rule]").forEach((item) => {
    const rule = item.dataset.rule;
    const ok = Boolean(checks?.[rule]);
    item.classList.toggle("ok", ok);
    item.classList.toggle("pending", !ok);
  });
}

function renderPasswordMeter(meterEl, checks, password) {
  if (!meterEl) return;
  const segments = Array.from(meterEl.querySelectorAll(".pass-meter-segment"));
  const labelEl = meterEl.querySelector(".pass-meter-label");
  const score = Object.values(checks || {}).filter(Boolean).length;

  let level = 0;
  let loading = false;
  let label = "Aguardando senha";

  if (password) {
    if (score <= 2) {
      level = 1;
      label = "Carregando seguranca";
      loading = true;
    } else if (score <= 4) {
      level = 2;
      label = "Senha em evolucao";
      loading = true;
    } else if (score <= 5) {
      level = 3;
      label = "Quase forte";
      loading = true;
    } else {
      level = 4;
      label = "Senha forte";
    }
  }

  meterEl.dataset.level = String(level);
  meterEl.dataset.loading = loading ? "true" : "false";
  segments.forEach((segment, index) => {
    segment.classList.toggle("active", index < level);
  });
  if (labelEl) labelEl.textContent = label;
}

function updatePolicy(inputEl, outputEl, rulesEl, meterEl) {
  const password = String(inputEl.value || "");
  const checks = getPasswordChecks(password);
  renderPasswordRules(rulesEl, checks);
  renderPasswordMeter(meterEl, checks, password);
  if (outputEl) {
    outputEl.className = "policy hidden";
    outputEl.textContent = "";
  }
}

function normalizeDocument(value) {
  return String(value || "").replace(/\D/g, "");
}

function allDigitsEqual(value) {
  return /^(\d)\1+$/.test(value);
}

function isValidCpf(cpf) {
  if (!/^\d{11}$/.test(cpf) || allDigitsEqual(cpf)) return false;
  const calc = (base, factor) => {
    let total = 0;
    for (let i = 0; i < base.length; i += 1) total += Number(base[i]) * (factor - i);
    const mod = (total * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

function isValidCnpj(cnpj) {
  if (!/^\d{14}$/.test(cnpj) || allDigitsEqual(cnpj)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calc = (base, weights) => {
    const total = base.split("").reduce((acc, digit, idx) => acc + Number(digit) * weights[idx], 0);
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(cnpj.slice(0, 12), w1);
  const d2 = calc(cnpj.slice(0, 13), w2);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

function parseDocument(value) {
  const digits = normalizeDocument(value);
  if (digits.length === 11 && isValidCpf(digits)) return { ok: true, normalized: digits, type: "cpf" };
  if (digits.length === 14 && isValidCnpj(digits)) return { ok: true, normalized: digits, type: "cnpj" };
  return { ok: false, normalized: digits, type: "" };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function jsonFromResponse(res) {
  try {
    return await res.json();
  } catch (_) {
    return { error: "Resposta invalida." };
  }
}

function timeoutResult() {
  return { ok: false, status: 408, data: { error: "Tempo limite excedido. Tente novamente." } };
}

async function checkDocumentAvailability(document) {
  try {
    const res = await fetchWithTimeout("/api/user-identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check", document })
    }, 3500);
    const data = await jsonFromResponse(res);
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    if (error && error.name === "AbortError") return timeoutResult();
    return { ok: false, status: 502, data: { error: "Falha de rede ao validar documento." } };
  }
}

async function registerUserIdentity(document) {
  return apiPost("/api/user-identity", { action: "register", document });
}

async function resolveEmailFromDocument(document) {
  try {
    const res = await fetchWithTimeout("/api/user-identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", document })
    }, 3500);
    const data = await jsonFromResponse(res);
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    if (error && error.name === "AbortError") return timeoutResult();
    return { ok: false, status: 502, data: { error: "Falha de rede ao localizar conta." } };
  }
}

async function registerPendingIdentity(user) {
  if (!user || !user.email) return;
  let pending;
  try {
    pending = JSON.parse(localStorage.getItem("pendingIdentity") || "null");
  } catch (_) {
    pending = null;
  }
  if (!pending || !pending.document) return;
  const sameEmail = String(pending.email || "").toLowerCase() === String(user.email || "").toLowerCase();
  if (!sameEmail) return;
  const identityResult = await registerUserIdentity(pending.document);
  if (identityResult.ok) {
    try { localStorage.removeItem("pendingIdentity"); } catch (_) {}
    return;
  }
  if (identityResult.status === 409) {
    await supabase.auth.signOut();
    setEntryStatus("err", "CPF/CNPJ ja esta vinculado a outra conta.");
    showOnly(entryScreenEl);
    return;
  }
  setEntryStatus("warn", identityResult.data.error || "Nao foi possivel vincular CPF/CNPJ agora.");
}

async function apiPost(url, payload) {
  if (!supabase) {
    return { ok: false, blocked: true, data: { error: "Supabase nao inicializado." } };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || "";
  if (!token) {
    setEntryStatus("warn", "Entre para continuar.");
    return { ok: false, blocked: true, data: { error: "Nao autenticado." } };
  }
  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }, 5000);
    const data = await jsonFromResponse(res);
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    if (error && error.name === "AbortError") return timeoutResult();
    return { ok: false, status: 502, data: { error: "Falha de rede. Verifique sua conexao." } };
  }
}

async function loadConfig() {
  let data;
  try {
    const res = await fetchWithTimeout("/api/app-config", {}, 3500);
    data = await jsonFromResponse(res);
    if (!res.ok) {
      setEntryStatus("err", data.error || "Nao foi possivel carregar configuracao do servidor.");
      setEntryNextStep("tente novamente em alguns segundos.");
      return null;
    }
  } catch (error) {
    const timeout = error && error.name === "AbortError";
    setEntryStatus("err", timeout ? "Servidor demorou para responder." : "Falha de rede ao carregar configuracoes.");
    setEntryNextStep("tente novamente em alguns segundos.");
    return null;
  }

  const cfg = data.config || {};
  if (!cfg.supabaseUrlConfigured || !cfg.supabaseAnonKeyConfigured || !cfg.supabaseServiceRoleConfigured || !cfg.encryptionConfigured) {
    setEntryStatus("err", "Configuracao incompleta no servidor.");
    setEntryNextStep("configure Supabase e ENCRYPTION_KEY antes de usar.");
  }
  return data;
}

async function initSupabase() {
  const data = await loadConfig();
  if (!data) return;
  const publicConfig = data.publicConfig || {};
  initFacebookLogin(publicConfig).catch(() => {
    // Mantem o app utilizavel mesmo se o SDK do Facebook falhar.
  });
  if (!publicConfig.supabaseUrl || !publicConfig.supabaseAnonKey) {
    setEntryStatus("err", "Supabase nao configurado na Vercel.");
    setEntryNextStep("confira SUPABASE_URL e SUPABASE_ANON_KEY no projeto.");
    return;
  }
  supabase = window.supabase.createClient(publicConfig.supabaseUrl, publicConfig.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  const hash = window.location.hash || "";
  if (hash.includes("type=recovery")) {
    showOnly(resetScreenEl);
    setEntryStatus("warn", "Defina sua nova senha para concluir a recuperacao.");
    setEntryNextStep("digite a nova senha e confirme.");
  }

  const { data: userData } = await supabase.auth.getUser();
  await updateAuthState(userData.user || null);

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      showOnly(resetScreenEl);
      setEntryStatus("warn", "Recuperacao confirmada. Defina a nova senha.");
      setEntryNextStep("preencha a nova senha e conclua.");
      return;
    }
    await updateAuthState(session?.user || null);
  });
}

function ensureSupabaseReady() {
  if (supabase && supabase.auth) return true;
  setEntryStatus("warn", "Aplicacao ainda inicializando configuracoes.");
  setEntryNextStep("aguarde 2 segundos e tente novamente.");
  return false;
}

async function updateAuthState(user) {
  currentUser = user || null;
  if (!currentUser) {
    setSignupMode(false);
    if (openPanelBtnEl) openPanelBtnEl.disabled = true;
    showOnly(entryScreenEl);
    openPanelScreen();
    setEntryStatus("", "");
    setEntryNextStep("");
    setAuthStatus("Usuario");
    setMainNextStep("realize login para habilitar o painel.");
    clearAvailableAccounts();
    clientSelectEl.innerHTML = "<option value=''>Selecione...</option>";
    return;
  }

  setEntryStatus("ok", `Sessao ativa para ${currentUser.email || "usuario"}.`);
  setEntryNextStep("clique em Abrir painel de metricas.");
  const panelName = getPanelName(currentUser);
  setAuthStatus(panelName);
  if (displayNameInputEl) displayNameInputEl.value = panelName;
  setDisplayNameEditMode(!hasSavedPanelName(currentUser));
  if (openPanelBtnEl) openPanelBtnEl.disabled = false;
  await registerPendingIdentity(currentUser);
  if (!currentUser) return;
  showOnly(metricsAppEl);
  openPanelScreen();
  setStatus("ok", "Painel de configuracoes aberto. Carregando dados...");
  setMainNextStep("sincronizando token Meta e clientes...");

  Promise.allSettled([checkTokenStatus(), loadClients()]).then(() => {
    if (!currentUser) return;
    setStatus("ok", "Painel de configuracoes aberto.");
  });
}

async function signUp() {
  if (!ensureSupabaseReady()) return;
  const email = signupEmailEl.value.trim().toLowerCase();
  const document = signupDocumentEl ? signupDocumentEl.value.trim() : "";
  const password = signupPasswordEl.value;
  const confirm = signupConfirmEl.value;
  const check = validateStrongPassword(password);
  const parsedDocument = parseDocument(document);
  if (!email || !email.includes("@")) {
    setEntryStatus("warn", "Informe um e-mail valido.");
    return;
  }
  if (!parsedDocument.ok) {
    setEntryStatus("warn", "Informe um CPF ou CNPJ valido.");
    return;
  }
  const docAvailability = await checkDocumentAvailability(parsedDocument.normalized);
  if (!docAvailability.ok) {
    setEntryStatus("err", docAvailability.data.error || "Nao foi possivel validar CPF/CNPJ.");
    return;
  }
  if (!docAvailability.data.available) {
    setEntryStatus("err", "CPF/CNPJ ja cadastrado em outra conta.");
    return;
  }
  if (!check.ok) {
    setEntryStatus("err", `Senha fraca: ${check.issues.join(", ")}.`);
    return;
  }
  if (password !== confirm) {
    setEntryStatus("err", "A confirmacao de senha nao confere.");
    return;
  }
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
  if (error) {
    setEntryStatus("err", error.message);
    setEntryNextStep("corrija os dados e tente novamente.");
    return;
  }
  if (data?.session?.user) {
    setSignupMode(false);
    const identityResult = await registerUserIdentity(parsedDocument.normalized);
    if (!identityResult.ok) {
      await supabase.auth.signOut();
      setEntryStatus("err", identityResult.data.error || "Nao foi possivel vincular CPF/CNPJ.");
      showOnly(entryScreenEl);
      return;
    }
    await updateAuthState(data.session.user);
    setStatus("ok", "Conta criada e acesso liberado automaticamente.");
    return;
  }
  try {
    localStorage.setItem("pendingIdentity", JSON.stringify({ email, document: parsedDocument.normalized }));
  } catch (_) {
    // Segue sem persistencia local.
  }
  setEntryStatus("ok", "Conta criada. Verifique seu e-mail para confirmar o cadastro.");
  setEntryNextStep("confirme o e-mail e depois clique em Entrar.");
  setSignupMode(false);
}

async function signIn() {
  if (!ensureSupabaseReady()) return;
  const identifier = String(loginEmailEl.value || "").trim().toLowerCase();
  const password = loginPasswordEl.value;
  if (!identifier) {
    setEntryStatus("warn", "Informe email, CPF ou CNPJ.");
    return;
  }
  let email = identifier;
  setLoginButtonLoading(true);
  try {
    if (!identifier.includes("@")) {
      const parsed = parseDocument(identifier);
      if (!parsed.ok) {
        setEntryStatus("warn", "Use email valido ou CPF/CNPJ valido.");
        return;
      }
      const resolved = await resolveEmailFromDocument(parsed.normalized);
      if (!resolved.ok || !resolved.data?.email) {
        setEntryStatus("err", "Login falhou. Verifique identificador e senha.");
        return;
      }
      email = String(resolved.data.email || "").toLowerCase();
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setEntryStatus("err", "Login falhou. Verifique identificador e senha.");
      setEntryNextStep("confira e-mail/senha ou abra Recuperar senha.");
      return;
    }
    setEntryStatus("ok", "Login realizado com sucesso.");
    setEntryNextStep("clique em Abrir painel de metricas.");
    toggleAuthCard(loginCardEl, false);
  } finally {
    setLoginButtonLoading(false);
  }
}

async function sendRecoveryEmail() {
  if (!ensureSupabaseReady()) return;
  const email = recoverEmailEl.value.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    setEntryStatus("warn", "Informe um e-mail valido para recuperacao.");
    return;
  }
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    setEntryStatus("err", error.message);
    setEntryNextStep("tente novamente em alguns segundos.");
    return;
  }
  setEntryStatus("ok", "Link de recuperacao enviado. Verifique o e-mail.");
  setEntryNextStep("abra o e-mail, clique no link e defina a nova senha.");
}

async function updateRecoveredPassword() {
  if (!ensureSupabaseReady()) return;
  const password = resetPasswordEl.value;
  const confirm = resetConfirmEl.value;
  const check = validateStrongPassword(password);
  if (!check.ok) {
    setEntryStatus("err", `Senha fraca: ${check.issues.join(", ")}.`);
    return;
  }
  if (password !== confirm) {
    setEntryStatus("err", "A confirmacao de senha nao confere.");
    return;
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    setEntryStatus("err", error.message);
    setEntryNextStep("tente abrir o link de recuperacao novamente.");
    return;
  }
  window.history.replaceState({}, document.title, window.location.pathname);
  showOnly(entryScreenEl);
  setEntryStatus("ok", "Senha redefinida com sucesso. Agora faca login.");
  setEntryNextStep("clique em Entrar e acesse o painel.");
}

async function logout() {
  if (!ensureSupabaseReady()) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    setStatus("err", error.message || "Nao foi possivel sair da conta agora.");
    return;
  }
  showOnly(entryScreenEl);
  setEntryStatus("ok", "Sessao encerrada com sucesso.");
  setEntryNextStep("faca login para acessar o painel.");
}

async function checkTokenStatus() {
  const result = await apiPost("/api/user-token", { action: "status" });
  if (!result.ok) {
    setTokenStatus("warn", "Nao foi possivel validar o token Meta agora.");
    clearAvailableAccounts();
    return;
  }
  if (result.data.configured) {
    setTokenStatus("ok", "Token Meta salvo com seguranca no servidor.");
    setMainNextStep("cadastre ou selecione um cliente e atualize as metricas.");
    if (tokenFormEl) tokenFormEl.classList.add("hidden");
    if (tokenToggleBtnEl) tokenToggleBtnEl.textContent = "Alterar";
    await loadAvailableAccounts();
  } else {
    setTokenStatus("warn", "Token Meta nao configurado.");
    setMainNextStep("cole seu token Meta e clique em Salvar token.");
    if (tokenFormEl) tokenFormEl.classList.remove("hidden");
    if (tokenToggleBtnEl) tokenToggleBtnEl.textContent = "Configurar";
    clearAvailableAccounts();
  }
}

async function saveMetaToken() {
  const token = metaTokenEl.value.trim();
  if (!token) {
    setStatus("warn", "Cole o token Meta antes de salvar.");
    return;
  }
  const result = await apiPost("/api/user-token", { action: "save", token });
  if (!result.ok) {
    setStatus("err", result.data.error || "Erro ao salvar token.");
    return;
  }
  metaTokenEl.value = "";
  setStatus("ok", "Token Meta salvo com seguranca.");
  await checkTokenStatus();
}

async function deleteMetaToken() {
  const result = await apiPost("/api/user-token", { action: "delete" });
  if (!result.ok) {
    setStatus("err", result.data.error || "Erro ao remover token.");
    return;
  }
  setStatus("warn", "Token Meta removido.");
  setMainNextStep("cole o novo token Meta e salve novamente.");
  clearAvailableAccounts();
  await checkTokenStatus();
}

async function loadClients() {
  const result = await apiPost("/api/user-clients", { action: "list" });
  if (!result.ok) return;
  renderClients(result.data.clients || []);
}

function renderClients(clients) {
  const uniqueClients = [];
  const seenAccounts = new Set();
  (clients || []).forEach((client) => {
    const key = normalizeAccountId(client.adAccountId);
    if (!key || seenAccounts.has(key)) return;
    seenAccounts.add(key);
    uniqueClients.push(client);
  });

  const selected = clientSelectEl.value;
  const selectedMetricsClient = metricsClientSelectEl ? metricsClientSelectEl.value : "";
  clientSelectEl.innerHTML = "<option value=''>Selecione...</option>";
  if (metricsClientSelectEl) metricsClientSelectEl.innerHTML = "<option value=''>Selecione...</option>";
  uniqueClients.forEach((client) => {
    const option = document.createElement("option");
    const clientName = String(client.name || "Cliente").trim();
    option.value = client.id;
    option.textContent = `${clientName} - ${client.adAccountId}`;
    option.dataset.name = clientName;
    option.dataset.account = client.adAccountId;
    option.dataset.apiVersion = client.apiVersion;
    if (client.id === selected) option.selected = true;
    clientSelectEl.appendChild(option);
    if (metricsClientSelectEl) {
      const metricsOption = option.cloneNode(true);
      if (client.id === selectedMetricsClient) metricsOption.selected = true;
      metricsClientSelectEl.appendChild(metricsOption);
    }
  });
  if (metricsClientSelectEl && !metricsClientSelectEl.value && metricsClientSelectEl.options.length > 1) {
    metricsClientSelectEl.selectedIndex = 1;
  }
  syncMetricsRemoveOptions();
}

function normalizeAccountId(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function getLinkedAccountPayload(option) {
  if (!option || !option.value) return null;
  const name = String(option.dataset.name || "Conta Meta").trim();
  return {
    name,
    adAccountId: String(option.dataset.account || option.value || "").trim(),
    apiVersion: String(option.dataset.apiVersion || "v25.0").trim() || "v25.0"
  };
}

async function ensureClientFromLinkedAccount(option, opts = {}) {
  const silent = Boolean(opts.silent);
  const linked = getLinkedAccountPayload(option);
  if (!linked || !linked.adAccountId) return false;

  const linkedAccountNormalized = normalizeAccountId(linked.adAccountId);
  const existingOption = Array.from(clientSelectEl.options || []).find((item) => {
    if (!item || !item.value) return false;
    return normalizeAccountId(item.dataset.account) === linkedAccountNormalized;
  });
  if (existingOption) {
    clientSelectEl.value = existingOption.value;
    if (metricsClientSelectEl) metricsClientSelectEl.value = existingOption.value;
    clientNameEl.value = existingOption.dataset.name || "";
    adAccountIdEl.value = existingOption.dataset.account || linked.adAccountId;
    apiVersionEl.value = existingOption.dataset.apiVersion || linked.apiVersion;
    if (!silent) {
      setStatus("ok", "Conta ja estava adicionada na sua lista de clientes.");
      setMainNextStep("cliente pronto. Agora clique em Atualizar metricas.");
    }
    return true;
  }

  clientNameEl.value = linked.name;
  adAccountIdEl.value = linked.adAccountId;
  apiVersionEl.value = linked.apiVersion;

  const payload = {
    action: "save",
    client: {
      id: clientSelectEl.value || "",
      name: linked.name,
      adAccountId: linked.adAccountId,
      apiVersion: linked.apiVersion
    }
  };

  const result = await apiPost("/api/user-clients", payload);
  if (!result.ok || !result.data?.client?.id) {
    if (!silent) {
      setStatus("err", result.data?.error || "Erro ao ativar conta vinculada.");
      setMainNextStep("confira o token Meta e tente novamente.");
    }
    return false;
  }

  renderClients(result.data.clients || []);
  clientSelectEl.value = result.data.client.id;
  if (metricsClientSelectEl) metricsClientSelectEl.value = result.data.client.id;
  if (!silent) {
    setStatus("ok", "Conta vinculada ativada automaticamente.");
    setMainNextStep("agora clique em Atualizar metricas.");
  }
  return true;
}

async function addSelectedLinkedAccounts() {
  const selectedOptions = Array.from(availableAccountSelectEl.selectedOptions || []).filter((option) => option.value);
  if (selectedOptions.length === 0) {
    setStatus("warn", "Selecione uma ou mais contas vinculadas.");
    setMainNextStep("marque as contas e clique em Adicionar selecionadas.");
    return;
  }

  let addedCount = 0;
  for (const option of selectedOptions) {
    const ok = await ensureClientFromLinkedAccount(option, { silent: true });
    if (ok) addedCount += 1;
  }

  if (addedCount === 0) {
    setStatus("warn", "Nenhuma conta foi adicionada agora.");
    return;
  }

  setStatus("ok", `${addedCount} cliente(s) adicionado(s) da selecao.`);
  setMainNextStep("escolha o cliente no campo Cliente para metricas e clique em Atualizar metricas.");
}

async function saveClient() {
  const payload = {
    action: "save",
    client: {
      id: clientSelectEl.value || "",
      name: clientNameEl.value.trim(),
      adAccountId: adAccountIdEl.value.trim(),
      apiVersion: apiVersionEl.value.trim() || "v25.0"
    }
  };
  if (!payload.client.name || !payload.client.adAccountId) {
    setStatus("warn", "Preencha nome do cliente e ID da conta antes de salvar.");
    setMainNextStep("selecione uma conta do token ou informe os dados manualmente.");
    return;
  }

  const result = await apiPost("/api/user-clients", payload);
  if (!result.ok) {
    setStatus("err", result.data.error || "Erro ao salvar cliente.");
    setMainNextStep("corrija os campos e tente salvar novamente.");
    return;
  }
  renderClients(result.data.clients || []);
  clientSelectEl.value = result.data.client.id;
  setStatus("ok", "Cliente salvo.");
  setMainNextStep("cliente confirmado. Agora clique em Atualizar metricas.");
}

async function removeClient() {
  if (!clientSelectEl.value) {
    setStatus("warn", "Selecione um cliente para remover.");
    return;
  }
  const result = await apiPost("/api/user-clients", { action: "remove", clientId: clientSelectEl.value });
  if (!result.ok) {
    setStatus("err", result.data.error || "Erro ao remover cliente.");
    return;
  }
  renderClients(result.data.clients || []);
  clientNameEl.value = "";
  adAccountIdEl.value = "";
  apiVersionEl.value = "v25.0";
  clearMetrics();
  setStatus("", "Cliente removido.");
  setMainNextStep("cadastre outro cliente ou selecione um existente.");
}

async function removeSelectedMetricsClients() {
  const selectedOptions = Array.from(metricsRemoveSelectEl?.selectedOptions || []).filter((option) => option.value);
  if (selectedOptions.length === 0) {
    setStatus("warn", "Selecione um ou mais clientes para remover.");
    return;
  }

  let removedCount = 0;
  for (const option of selectedOptions) {
    const result = await apiPost("/api/user-clients", { action: "remove", clientId: option.value });
    if (result.ok) removedCount += 1;
  }

  await loadClients();
  clearMetrics();
  closeMetricsRemoveMenu();
  setStatus("ok", `${removedCount} cliente(s) removido(s).`);
  setMainNextStep("selecione outro cliente para atualizar metricas.");
}

function clearMetrics() {
  kSpendEl.textContent = brMoney(0);
  kClicksEl.textContent = brInt(0);
  kLeadsEl.textContent = brInt(0);
  kCtrEl.textContent = "0,00%";
  kCpcEl.textContent = brMoney(0);
  kCplEl.textContent = brMoney(0);
  kLinkCtrEl.textContent = "0,00%";
  kCpmEl.textContent = brMoney(0);
  kMsgStart7dEl.textContent = brInt(0);
  kReachEl.textContent = brInt(0);
  kImpressionsEl.textContent = brInt(0);
  kFrequencyEl.textContent = "0,00";
  kResultsEl.textContent = brInt(0);
  kResultTypeEl.textContent = "-";
  kDailySpendEl.textContent = brMoney(0);
  objectiveSummaryEl.textContent = "Carregue as métricas para gerar o resumo estratégico.";
  renderAgencyPresetPreview(null);
  if (advancedMetricsEl) advancedMetricsEl.textContent = "Carregue as métricas para visualizar indicadores avançados.";
  stageBarsEl.innerHTML = "";
  topAdsListEl.innerHTML = "";
  cvIndicatorsEl.innerHTML = "";
  cvObjectiveEl.textContent = "Sem dados.";
  cvStagesEl.innerHTML = "Sem dados.";
  cvTopAdsEl.innerHTML = "";
  tableBodyEl.innerHTML = '<tr><td colspan="18">Sem dados ainda.</td></tr>';
  adviceEl.textContent = "As dicas aparecerao aqui.";
  rawOutputEl.textContent = "Sem requisicao executada.";
  lastMetricsPayload = null;
}

function updateCards(summary) {
  kSpendEl.textContent = brMoney(summary.spend);
  kClicksEl.textContent = brInt(summary.clicks);
  kLeadsEl.textContent = brInt(summary.leads);
  kCtrEl.textContent = `${Number(summary.ctr || 0).toFixed(2).replace(".", ",")}%`;
  kCpcEl.textContent = brMoney(summary.cpc);
  kCplEl.textContent = brMoney(summary.cpl);
  kLinkCtrEl.textContent = toPercent(summary.advanced?.link_ctr || 0);
  kCpmEl.textContent = brMoney(summary.cpm || 0);
  kMsgStart7dEl.textContent = brInt(summary.advanced?.messaging_conversation_started_7d || 0);
  renderAgencyPresetPreview(summary);
  renderAdvancedMetrics(summary);
}

function updateMetricsHistory(payload) {
  metricsHistory.unshift({
    date: new Date().toLocaleString(),
    client: payload.clientName,
    reportType: payload.reportType,
    periodDays: payload.periodDays,
    metrics: payload.metrics
  });
  if (metricsHistory.length > 10) metricsHistory.length = 10;
  const ul = document.getElementById("metricsHistory");
  if (!ul) return;
  ul.innerHTML = metricsHistory.map(item =>
    `<li><b>${item.date}</b> - ${item.client} (${item.reportType}, ${item.periodDays}d): Gasto ${brMoney(item.metrics.spend)}, Cliques ${brInt(item.metrics.clicks)}, Leads ${brInt(item.metrics.leads)}</li>`
  ).join("");
}

function renderMediaCell(row) {
  const imageUrl = row.thumbnail_url || row.image_url || "";
  const videoUrl = row.video_watch_url || "";

  if (!imageUrl && !videoUrl) {
    return "<span style=\"color:#6b7f94;\">Sem mídia</span>";
  }

  const imagePart = imageUrl
    ? `<a href="${imageUrl}" target="_blank" rel="noopener noreferrer" title="Abrir imagem"><img src="${imageUrl}" alt="Mídia do anúncio" style="width:52px;height:52px;object-fit:cover;border-radius:8px;border:1px solid #d9e5ef;" /></a>`
    : "";
  const videoPart = videoUrl
    ? `<a href="${videoUrl}" target="_blank" rel="noopener noreferrer" style="font-size:0.8rem;font-weight:700;color:#0f6ea8;text-decoration:none;">Vídeo</a>`
    : "";

  return `<div style="display:flex;gap:8px;align-items:center;">${imagePart}${videoPart}</div>`;
}

function updateTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    tableBodyEl.innerHTML = '<tr><td colspan="18">Sem linhas para o periodo selecionado.</td></tr>';
    return;
  }
  tableBodyEl.innerHTML = rows.map((row) => `
    <tr>
      <td data-label="Campanha">${row.campaign_name || "-"}</td>
      <td data-label="Conjunto">${row.adset_name || "-"}</td>
      <td data-label="Anúncio">${row.ad_name || "-"}</td>
      <td data-label="Mídia">${renderMediaCell(row)}</td>
      <td data-label="Tipo">${row.item_type || "-"}</td>
      <td data-label="Público">${brInt(row.reach || 0)}</td>
      <td data-label="Impressões">${brInt(row.impressions || 0)}</td>
      <td data-label="Gasto">${brMoney(row.spend)}</td>
      <td data-label="Cliques">${brInt(row.clicks || 0)}</td>
      <td data-label="Cliques link">${brInt(row.link_clicks || 0)}</td>
      <td data-label="Conversas 7d">${brInt(row.messaging_conversation_started_7d || 0)}</td>
      <td data-label="CTR">${Number(row.ctr || 0).toFixed(2).replace(".", ",")}%</td>
      <td data-label="CTR link">${toPercent(row.link_ctr || 0)}</td>
      <td data-label="CPC">${brMoney(row.cpc || 0)}</td>
      <td data-label="CPC link">${brMoney(row.link_cpc || 0)}</td>
      <td data-label="CPM">${brMoney(row.cpm || 0)}</td>
      <td data-label="Frequência">${Number(row.frequency || 0).toFixed(2).replace(".", ",")}</td>
      <td data-label="Resultado">${brInt(row.results || row.leads || 0)} (${row.result_type || "-"})</td>
    </tr>
  `).join("");
}

async function loadMetrics() {
  const selectedClientEl = metricsClientSelectEl || clientSelectEl;
  const selected = selectedClientEl.options[selectedClientEl.selectedIndex];
  if (!selected || !selected.value) {
    setStatus("warn", "Selecione um cliente no campo Cliente para metricas.");
    setMainNextStep("marque contas vinculadas, clique em Adicionar selecionadas e escolha o cliente.");
    return;
  }
  const dateStartEl = document.getElementById("dateStart");
  const dateEndEl = document.getElementById("dateEnd");
  const dateStart = dateStartEl && dateStartEl.value ? dateStartEl.value : null;
  const dateEnd = dateEndEl && dateEndEl.value ? dateEndEl.value : null;
  if (!dateStart || !dateEnd) {
    setStatus("warn", "Selecione a data inicial e final.");
    return;
  }
  const payload = {
    apiVersion: apiVersionEl.value.trim() || selected.dataset.apiVersion || "v25.0",
    adAccountId: adAccountIdEl.value.trim() || selected.dataset.account || "",
    dateStart,
    dateEnd,
    reportType: reportTypeEl.value,
    agencyMetricFocus: "lead"
  };
  rawOutputEl.textContent = "Carregando...";
  const result = await apiPost("/api/meta-insights", payload);
  rawOutputEl.textContent = JSON.stringify(result.data, null, 2);
  if (!result.ok || !result.data.ok) {
    setStatus("err", result.data.error || "Falha ao consultar a Meta API.");
    setMainNextStep("confira token Meta, cliente e tente novamente.");
    clearMetrics();
    return;
  }
  updateCards(result.data.summary || {});
  updateTable(result.data.rows || []);
  updateExecutiveBlocks(result.data.rows || [], result.data.summary || {}, result.data.context || {}, dateStart, dateEnd);
  lastMetricsPayload = {
    clientName: selected.dataset.name || "Cliente",
    reportType: reportTypeEl.value,
    agencyMetricFocus: "lead",
    dateStart,
    dateEnd,
    metrics: result.data.summary || {},
    rows: result.data.rows || []
  };
  updateMetricsHistory(lastMetricsPayload);
  openMetricsScreen();
  setStatus("ok", "Metricas atualizadas.");
  setMainNextStep("clique em Gerar dicas da IA.");
}

function getAdviceUserName() {
  return getPanelName(currentUser) || "Usuario";
}

async function loadAdvice(extra = {}) {
  if (!lastMetricsPayload) {
    setStatus("warn", "Atualize metricas antes de pedir recomendacoes.");
    return;
  }

  adviceEl.textContent = "Gerando recomendacoes...";
  const payload = {
    ...lastMetricsPayload,
    userName: getAdviceUserName(),
    objectiveSummary: objectiveSummaryEl ? objectiveSummaryEl.textContent.trim() : "",
    ...extra
  };
  const result = await apiPost("/api/claude-helper", payload);
  if (!result.ok || !result.data.ok) {
    adviceEl.textContent = "Nao foi possivel gerar dicas agora.";
    setMainNextStep("faca login novamente ou tente mais tarde.");
    return;
  }

  const advice = result.data.advice || {};
  const greeting = String(advice.greeting || "").trim();
  const diagnosis = Array.isArray(advice.diagnosis) ? advice.diagnosis : [];
  const alerts = Array.isArray(advice.alerts) ? advice.alerts : [];
  const recommendations = Array.isArray(advice.recommendations) ? advice.recommendations : [];

  adviceEl.textContent = [
    greeting || null,
    greeting ? "" : null,
    `Modo: ${result.data.mode || "fallback"}`,
    "",
    `Resumo: ${advice.summary || "-"}`,
    "",
    diagnosis.length ? "Diagnostico:" : null,
    ...diagnosis.map((item, index) => `${index + 1}. ${item}`),
    diagnosis.length ? "" : null,
    alerts.length ? "Alertas:" : null,
    ...alerts.map((item, index) => `${index + 1}. ${item}`),
    alerts.length ? "" : null,
    "Recomendações:",
    ...recommendations.map((item, index) => `${index + 1}. ${item}`),
    "",
    `Próxima ação: ${advice.nextAction || "-"}`
  ].filter(Boolean).join("\n");
  setMainNextStep("revise as recomendacoes e ajuste as campanhas.");
}

function exportExecutivePdf() {
  if (!lastMetricsPayload) {
    setStatus("warn", "Atualize métricas antes de exportar o PDF.");
    return;
  }

  const now = new Date().toLocaleString("pt-BR");
  const clientLabel = lastMetricsPayload.clientName || "Cliente";
  const periodLabel = `${lastMetricsPayload.dateStart || "-"} até ${lastMetricsPayload.dateEnd || "-"}`;
  const indicadores = [
    ["Gasto", kSpendEl.textContent],
    ["Público atingido", kReachEl.textContent],
    ["Impressões", kImpressionsEl.textContent],
    ["Cliques", kClicksEl.textContent],
    ["Leads", kLeadsEl.textContent],
    ["CTR", kCtrEl.textContent],
    ["CPC", kCpcEl.textContent],
    ["CPM", document.getElementById("kCpm") ? document.getElementById("kCpm").textContent : "-"],
    ["Frequência", kFrequencyEl.textContent],
    ["Resultado principal", `${kResultsEl.textContent} (${kResultTypeEl.textContent})`],
    ["Investimento diário", kDailySpendEl.textContent]
  ];

  const stageLines = Array.from(stageBarsEl.querySelectorAll("div > div:first-child"))
    .map((el) => el.textContent.trim())
    .filter(Boolean);

  const topAdsLines = Array.from(topAdsListEl.querySelectorAll("li"))
    .map((el) => el.textContent.trim())
    .filter(Boolean);

  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) {
    setStatus("warn", "O navegador bloqueou a janela de exportação. Permita pop-ups para continuar.");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Executivo - ${escapeHtml(clientLabel)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 28px; color: #102a43; }
    h1 { margin: 0 0 6px; font-size: 26px; }
    .meta { color: #486581; margin-bottom: 18px; }
    .section { margin-top: 20px; }
    .box { border: 1px solid #d9e5ef; border-radius: 10px; padding: 12px; background: #f8fbff; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .item { border: 1px solid #d9e5ef; border-radius: 10px; padding: 10px; }
    .k { font-size: 12px; color: #486581; text-transform: uppercase; }
    .v { font-size: 20px; font-weight: 700; margin-top: 4px; }
    ul, ol { margin: 8px 0 0 18px; }
  </style>
</head>
<body>
  <h1>Relatório Executivo de Campanhas</h1>
  <div class="meta">Cliente: ${escapeHtml(clientLabel)} | Período: ${escapeHtml(periodLabel)} | Gerado em: ${escapeHtml(now)}</div>

  <div class="section">
    <h2>Indicadores principais</h2>
    <div class="grid">
      ${indicadores.map(([k, v]) => `<div class="item"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(v)}</div></div>`).join("")}
    </div>
  </div>

  <div class="section">
    <h2>Objetivo estratégico</h2>
    <div class="box">${escapeHtml(objectiveSummaryEl.textContent)}</div>
  </div>

  <div class="section">
    <h2>Distribuição por etapa</h2>
    <div class="box">
      <ul>${stageLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("") || "<li>Sem dados.</li>"}</ul>
    </div>
  </div>

  <div class="section">
    <h2>Top anúncios por resultado</h2>
    <div class="box">
      <ol>${topAdsLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("") || "<li>Sem dados.</li>"}</ol>
    </div>
  </div>

  <script>
    window.onload = () => { window.print(); };
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

function bindEvents() {
      // Relatórios: intervalo de datas simples + atalhos
      const dateStartEl = document.getElementById("dateStart");
      const dateEndEl = document.getElementById("dateEnd");
      const dateQuick7Btn = document.getElementById("dateQuick7");
      const dateQuick15Btn = document.getElementById("dateQuick15");
      const dateQuick30Btn = document.getElementById("dateQuick30");
      const dateQuickMonthBtn = document.getElementById("dateQuickMonth");

      function setQuickPeriod(days) {
        const today = new Date();
        const end = today.toISOString().slice(0, 10);
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - (days - 1));
        const start = startDate.toISOString().slice(0, 10);
        if (dateStartEl) dateStartEl.value = start;
        if (dateEndEl) dateEndEl.value = end;
      }

      function setCurrentMonthRange() {
        const today = new Date();
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        if (dateStartEl) dateStartEl.value = first.toISOString().slice(0, 10);
        if (dateEndEl) dateEndEl.value = today.toISOString().slice(0, 10);
      }

      if (dateQuick7Btn) dateQuick7Btn.addEventListener("click", () => setQuickPeriod(7));
      if (dateQuick15Btn) dateQuick15Btn.addEventListener("click", () => setQuickPeriod(15));
      if (dateQuick30Btn) dateQuick30Btn.addEventListener("click", () => setQuickPeriod(30));
      if (dateQuickMonthBtn) dateQuickMonthBtn.addEventListener("click", setCurrentMonthRange);

      // Inicializa em 30 dias para melhor visão no primeiro uso
      setQuickPeriod(30);
    // Interação com recomendações da IA
    const adviceUsefulBtn = document.getElementById("adviceUsefulBtn");
    const adviceNotUsefulBtn = document.getElementById("adviceNotUsefulBtn");
    const adviceRefreshBtn = document.getElementById("adviceRefreshBtn");
    const adviceAskBtn = document.getElementById("adviceAskBtn");
    const adviceQuestion = document.getElementById("adviceQuestion");

    if (adviceUsefulBtn) adviceUsefulBtn.onclick = () => setStatus("ok", "Obrigado pelo feedback! IA marcada como útil.");
    if (adviceNotUsefulBtn) adviceNotUsefulBtn.onclick = () => setStatus("warn", "Feedback registrado: dica não foi útil.");
    if (adviceRefreshBtn) adviceRefreshBtn.onclick = () => loadAdvice({ refresh: true });
    if (adviceAskBtn && adviceQuestion) adviceAskBtn.onclick = () => {
      const question = adviceQuestion.value.trim();
      if (!question) return;
      loadAdvice({ question });
      adviceQuestion.value = "";
    };
  document.getElementById("showSignupBtn").addEventListener("click", () => {
    setSignupMode(true);
    setEntryNextStep("preencha e-mail, senha forte e confirme a conta.");
  });
  const showLoginBtn = document.getElementById("showLoginBtn");
  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", () => {
      toggleAuthCard(loginCardEl, true);
      setEntryNextStep("digite e-mail e senha para entrar.");
    });
  }
  document.getElementById("openRecoverBtn").addEventListener("click", () => {
    showOnly(recoverScreenEl);
    setEntryNextStep("informe o e-mail e envie o link de recuperacao.");
  });
  document.getElementById("backToEntryBtn").addEventListener("click", () => {
    setSignupMode(false);
    showOnly(entryScreenEl);
    setEntryNextStep("clique em Criar conta, Entrar ou Recuperar senha.");
  });
  document.getElementById("cancelSignupBtn").addEventListener("click", () => setSignupMode(false));
  const cancelLoginBtn = document.getElementById("cancelLoginBtn");
  if (cancelLoginBtn) cancelLoginBtn.addEventListener("click", () => toggleAuthCard(loginCardEl, false));
  document.getElementById("doSignupBtn").addEventListener("click", signUp);
  document.getElementById("doLoginBtn").addEventListener("click", signIn);
  if (loginEmailEl) {
    loginEmailEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") signIn();
    });
  }
  if (loginPasswordEl) {
    loginPasswordEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") signIn();
    });
  }
  document.getElementById("doRecoverBtn").addEventListener("click", sendRecoveryEmail);
  document.getElementById("doResetBtn").addEventListener("click", updateRecoveredPassword);
  const openMetricsScreenBtn = document.getElementById("openMetricsScreenBtn");
  if (openMetricsScreenBtn) {
    openMetricsScreenBtn.addEventListener("click", () => {
      showOnly(metricsAppEl);
      openMetricsScreen();
    });
  }
  const backToPanelBtn = document.getElementById("backToPanelBtn");
  if (backToPanelBtn) {
    backToPanelBtn.addEventListener("click", () => {
      showOnly(metricsAppEl);
      openPanelScreen();
    });
  }
  document.getElementById("backToEntryFromResetBtn").addEventListener("click", () => {
    setSignupMode(false);
    showOnly(entryScreenEl);
    setEntryNextStep("clique em Entrar com sua nova senha.");
  });
  document.getElementById("logoutBtn").addEventListener("click", logout);
  if (saveDisplayNameBtnEl) saveDisplayNameBtnEl.addEventListener("click", savePanelName);
  if (editDisplayNameBtnEl) {
    editDisplayNameBtnEl.addEventListener("click", () => {
      setDisplayNameEditMode(true);
      if (displayNameInputEl) {
        displayNameInputEl.focus();
        displayNameInputEl.select();
      }
    });
  }
  if (displayNameInputEl) {
    displayNameInputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") savePanelName();
    });
  }
  const openPanelBtn = document.getElementById("openPanelBtn");
  if (openPanelBtn) {
    openPanelBtn.addEventListener("click", () => {
      if (!currentUser) {
        setEntryStatus("warn", "Entre antes de abrir o painel.");
        return;
      }
      showOnly(metricsAppEl);
      setStatus("ok", "Painel aberto.");
      setMainNextStep("salve o token Meta, cadastre um cliente e atualize as metricas.");
    });
  }
  document.getElementById("saveTokenBtn").addEventListener("click", saveMetaToken);
  document.getElementById("deleteTokenBtn").addEventListener("click", deleteMetaToken);
  if (tokenToggleBtnEl) tokenToggleBtnEl.addEventListener("click", () => { if (tokenFormEl) tokenFormEl.classList.toggle("hidden"); });
  if (linkedAccountsToggleBtnEl) {
    linkedAccountsToggleBtnEl.addEventListener("click", () => {
      if (!linkedAccountsMenuEl) return;
      linkedAccountsMenuEl.classList.toggle("hidden");
      if (!linkedAccountsMenuEl.classList.contains("hidden") && linkedAccountsSearchEl) {
        linkedAccountsSearchEl.focus();
      }
    });
  }
  if (linkedAccountsSearchEl) {
    linkedAccountsSearchEl.addEventListener("input", () => renderLinkedAccountsList(linkedAccountsSearchEl.value));
  }
  // Usa captura para fechar antes de controles nativos (como select) abrirem por cima.
  document.addEventListener("pointerdown", (event) => {
    maybeCloseLinkedAccountsMenu(event.target);
    maybeCloseMetricsRemoveMenu(event.target);
  }, true);
  document.addEventListener("click", (event) => {
    maybeCloseLinkedAccountsMenu(event.target);
    maybeCloseMetricsRemoveMenu(event.target);
  });
  document.addEventListener("focusin", (event) => {
    maybeCloseLinkedAccountsMenu(event.target);
    maybeCloseMetricsRemoveMenu(event.target);
  });
  if (addLinkedAccountsBtnEl) addLinkedAccountsBtnEl.addEventListener("click", addSelectedLinkedAccounts);
  if (metricsRemoveToggleBtnEl) {
    metricsRemoveToggleBtnEl.addEventListener("click", () => {
      if (!metricsRemoveMenuEl) return;
      metricsRemoveMenuEl.classList.toggle("hidden");
      if (!metricsRemoveMenuEl.classList.contains("hidden") && metricsRemoveSearchEl) {
        metricsRemoveSearchEl.focus();
      }
    });
  }
  if (metricsRemoveSearchEl) {
    metricsRemoveSearchEl.addEventListener("input", () => renderMetricsRemoveList(metricsRemoveSearchEl.value));
  }
  if (removeMetricsSelectedBtnEl) removeMetricsSelectedBtnEl.addEventListener("click", removeSelectedMetricsClients);
  document.getElementById("saveClientBtn").addEventListener("click", saveClient);
  document.getElementById("removeClientBtn").addEventListener("click", removeClient);
  document.getElementById("loadMetricsBtn").addEventListener("click", loadMetrics);
  const loadMetricsPanelBtnEl = document.getElementById("loadMetricsPanelBtn");
  if (loadMetricsPanelBtnEl) loadMetricsPanelBtnEl.addEventListener("click", loadMetrics);
  document.getElementById("clientViewBtn").addEventListener("click", openClientView);
  document.getElementById("exportPdfBtn").addEventListener("click", exportExecutivePdf);
  document.getElementById("loadAdviceBtn").addEventListener("click", loadAdvice);
  document.getElementById("cvBackBtn").addEventListener("click", closeClientView);
  document.getElementById("cvPrintBtn").addEventListener("click", exportExecutivePdf);
  signupPasswordEl.addEventListener("input", () => updatePolicy(signupPasswordEl, signupPolicyEl, signupRulesEl, signupStrengthMeterEl));
  resetPasswordEl.addEventListener("input", () => updatePolicy(resetPasswordEl, resetPolicyEl, resetRulesEl, resetStrengthMeterEl));
  updatePolicy(signupPasswordEl, signupPolicyEl, signupRulesEl, signupStrengthMeterEl);
  updatePolicy(resetPasswordEl, resetPolicyEl, resetRulesEl, resetStrengthMeterEl);
  clientSelectEl.addEventListener("change", () => {
    const option = clientSelectEl.options[clientSelectEl.selectedIndex];
    if (!option || !option.value) return;
    if (metricsClientSelectEl) metricsClientSelectEl.value = option.value;
    clientNameEl.value = option.dataset.name || "";
    adAccountIdEl.value = option.dataset.account || "";
    apiVersionEl.value = option.dataset.apiVersion || "v25.0";
    clearMetrics();
    setMainNextStep("clique em Atualizar metricas para este cliente.");
  });
  availableAccountSelectEl.addEventListener("change", () => {
    const selectedCount = getSelectedLinkedAccountsCount();
    updateLinkedAccountsToggleText();
    if (selectedCount > 0) setMainNextStep(`${selectedCount} conta(s) marcada(s). Clique em Adicionar selecionadas.`);
  });
  if (metricsClientSelectEl) {
    metricsClientSelectEl.addEventListener("mousedown", closeLinkedAccountsMenu);
    metricsClientSelectEl.addEventListener("focus", closeLinkedAccountsMenu);
    metricsClientSelectEl.addEventListener("change", () => {
      closeLinkedAccountsMenu();
      const option = metricsClientSelectEl.options[metricsClientSelectEl.selectedIndex];
      if (!option || !option.value) {
        updateMetricsRemoveToggleText();
        return;
      }
      clientSelectEl.value = option.value;
      clientNameEl.value = option.dataset.name || "";
      adAccountIdEl.value = option.dataset.account || "";
      apiVersionEl.value = option.dataset.apiVersion || "v25.0";
      clearMetrics();
      setMainNextStep("cliente definido. Agora clique em Atualizar metricas.");
      updateMetricsRemoveToggleText();
    });
  }
  updateMetricsRemoveToggleText();
  document.querySelectorAll("#periodChips .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#periodChips .chip").forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
      selectedPeriodDays = Number(chip.dataset.days);
      setMainNextStep(`periodo definido em ${selectedPeriodDays} dia(s); agora atualize as metricas.`);
    });
  });
}

bindEvents();
clearMetrics();
setEntryNextStep("clique em Criar conta, Entrar ou Recuperar senha.");
setMainNextStep("autentique-se para liberar o painel.");
initSupabase();
})();
