// Facebook Login e listagem de contas de anúncio
window.fbAsyncInit = function() {
  FB.init({
    appId      : 'SEU_APP_ID_AQUI', // Substitua pelo seu App ID
    cookie     : true,
    xfbml      : true,
    version    : 'v18.0'
  });
};

function showFbPanel() {
  document.getElementById('fbPanel').style.display = 'block';
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

const entryStatusEl = document.getElementById("entryStatus");
const entryNextStepEl = document.getElementById("entryNextStep");
const statusEl = document.getElementById("status");
const mainNextStepEl = document.getElementById("mainNextStep");
const authStatusEl = document.getElementById("authStatus");
const tokenStatusEl = document.getElementById("tokenStatus");

const signupEmailEl = document.getElementById("signupEmail");
const signupPasswordEl = document.getElementById("signupPassword");
const signupConfirmEl = document.getElementById("signupConfirm");
const signupPolicyEl = document.getElementById("signupPolicy");
const loginEmailEl = document.getElementById("loginEmail");
const loginPasswordEl = document.getElementById("loginPassword");
const recoverEmailEl = document.getElementById("recoverEmail");
const resetPasswordEl = document.getElementById("resetPassword");
const resetConfirmEl = document.getElementById("resetConfirm");
const resetPolicyEl = document.getElementById("resetPolicy");
const openPanelBtnEl = document.getElementById("openPanelBtn");

const metaTokenEl = document.getElementById("metaToken");
const availableAccountSelectEl = document.getElementById("availableAccountSelect");
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

function brMoney(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function brInt(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
}

function setStatus(kind, message) {
  statusEl.className = "status";
  if (kind) statusEl.classList.add(kind);
  statusEl.textContent = message;
}

function setEntryStatus(kind, message) {
  entryStatusEl.className = "status";
  if (kind) entryStatusEl.classList.add(kind);
  entryStatusEl.textContent = message;
}

function setMainNextStep(message) {
  mainNextStepEl.textContent = `Proximo passo: ${message}`;
}

function setEntryNextStep(message) {
  entryNextStepEl.textContent = `Proximo passo: ${message}`;
}

function setAuthStatus(kind, message) {
  authStatusEl.className = "status";
  if (kind) authStatusEl.classList.add(kind);
  authStatusEl.textContent = message;
}

function setTokenStatus(kind, message) {
  tokenStatusEl.className = "status";
  if (kind) tokenStatusEl.classList.add(kind);
  tokenStatusEl.textContent = message;
}

function clearAvailableAccounts() {
  availableAccountSelectEl.innerHTML = "<option value=''>Selecione...</option>";
}

function renderAvailableAccounts(accounts) {
  const selected = availableAccountSelectEl.value;
  clearAvailableAccounts();
  accounts.forEach((account) => {
    const option = document.createElement("option");
    const numericId = account.accountId || account.id || "";
    option.value = numericId;
    option.textContent = `${account.name} - act_${numericId}`;
    option.dataset.account = numericId;
    option.dataset.apiVersion = apiVersionEl.value.trim() || "v22.0";
    if (numericId === selected) option.selected = true;
    availableAccountSelectEl.appendChild(option);
  });
}

async function loadAvailableAccounts() {
  const result = await apiPost("/api/user-token", { action: "accounts", apiVersion: apiVersionEl.value.trim() || "v22.0" });
  if (!result.ok) {
    clearAvailableAccounts();
    setStatus("warn", "Nao foi possivel listar contas do token agora.");
    return;
  }
  renderAvailableAccounts(result.data.accounts || []);
}

function showOnly(screen) {
  [entryScreenEl, recoverScreenEl, resetScreenEl, metricsAppEl].forEach((el) => el.classList.add("hidden"));
  screen.classList.remove("hidden");
}

function toggleAuthCard(card, show) {
  card.classList.toggle("hidden", !show);
}

function validateStrongPassword(password) {
  const issues = [];
  if (password.length < 12) issues.push("minimo de 12 caracteres");
  if (!/[A-Z]/.test(password)) issues.push("1 letra maiuscula");
  if (!/[a-z]/.test(password)) issues.push("1 letra minuscula");
  if (!/\d/.test(password)) issues.push("1 numero");
  if (!/[^A-Za-z0-9]/.test(password)) issues.push("1 simbolo");
  if (/\s/.test(password)) issues.push("sem espacos");
  return { ok: issues.length === 0, issues };
}

function updatePolicy(inputEl, outputEl) {
  const password = String(inputEl.value || "").trim();
  if (!password) {
    outputEl.className = "policy warn";
    outputEl.textContent = "Senha deve ter 12+ caracteres, maiuscula, minuscula, numero e simbolo.";
    return;
  }
  const check = validateStrongPassword(password);
  if (check.ok) {
    outputEl.className = "policy ok";
    outputEl.textContent = "Senha forte. Pode continuar.";
  } else {
    outputEl.className = "policy err";
    outputEl.textContent = `Falta: ${check.issues.join(", ")}.`;
  }
}

async function apiPost(url, payload) {
  if (!supabase) {
    return { ok: false, blocked: true, data: { error: "Supabase nao inicializado." } };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || "";
  if (!token) {
    setEntryStatus("warn", "Faca login primeiro.");
    return { ok: false, blocked: true, data: { error: "Nao autenticado." } };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  let data;
  try { data = await res.json(); } catch (_) { data = { error: "Resposta invalida." }; }
  return { ok: res.ok, status: res.status, data };
}

async function loadConfig() {
  const res = await fetch("/api/app-config");
  const data = await res.json();
  const cfg = data.config || {};
  if (!cfg.supabaseUrlConfigured || !cfg.supabaseAnonKeyConfigured || !cfg.supabaseServiceRoleConfigured || !cfg.encryptionConfigured) {
    setEntryStatus("err", "Configuracao incompleta no servidor.");
    setEntryNextStep("configure Supabase e ENCRYPTION_KEY antes de usar.");
  }
  return data;
}

async function initSupabase() {
  const data = await loadConfig();
  const publicConfig = data.publicConfig || {};
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
  // Modo teste: ignora autenticação e libera painel direto
  currentUser = user || { email: "teste@demo.com" };
  setEntryStatus("ok", `Modo teste: acesso liberado sem login.`);
  setEntryNextStep("clique em Abrir painel de metricas.");
  setAuthStatus("ok", `Conta de teste ativa.`);
  openPanelBtnEl.disabled = false;
  await checkTokenStatus();
  await loadClients();
}

async function signUp() {
  if (!ensureSupabaseReady()) return;
  const email = signupEmailEl.value.trim().toLowerCase();
  const password = signupPasswordEl.value;
  const confirm = signupConfirmEl.value;
  const check = validateStrongPassword(password);
  if (!email || !email.includes("@")) {
    setEntryStatus("warn", "Informe um e-mail valido.");
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
  const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
  if (error) {
    setEntryStatus("err", error.message);
    setEntryNextStep("corrija os dados e tente novamente.");
    return;
  }
  setEntryStatus("ok", "Conta criada. Verifique seu e-mail para confirmar o cadastro.");
  setEntryNextStep("confirme o e-mail e depois clique em Entrar.");
  toggleAuthCard(signupCardEl, false);
}

async function signIn() {
  if (!ensureSupabaseReady()) return;
  const email = loginEmailEl.value.trim().toLowerCase();
  const password = loginPasswordEl.value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setEntryStatus("err", "Login falhou. Se necessario, use Recuperar senha.");
    setEntryNextStep("confira e-mail/senha ou abra Recuperar senha.");
    return;
  }
  setEntryStatus("ok", "Login realizado com sucesso.");
  setEntryNextStep("clique em Abrir painel de metricas.");
  toggleAuthCard(loginCardEl, false);
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
  await supabase.auth.signOut();
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
    await loadAvailableAccounts();
  } else {
    setTokenStatus("warn", "Token Meta nao configurado.");
    setMainNextStep("cole seu token Meta e clique em Salvar token.");
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
  const selected = clientSelectEl.value;
  clientSelectEl.innerHTML = "<option value=''>Selecione...</option>";
  clients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client.id;
    option.textContent = `${client.name} - act_${client.adAccountId}`;
    option.dataset.account = client.adAccountId;
    option.dataset.apiVersion = client.apiVersion;
    if (client.id === selected) option.selected = true;
    clientSelectEl.appendChild(option);
  });
}

async function saveClient() {
  const payload = {
    action: "save",
    client: {
      id: clientSelectEl.value || "",
      name: clientNameEl.value.trim(),
      adAccountId: adAccountIdEl.value.trim(),
      apiVersion: apiVersionEl.value.trim() || "v25.0",
    apiVersionEl.value = option.dataset.apiVersion || "v25.0";
  apiVersionEl.value = "v25.0";
    apiVersion: apiVersionEl.value.trim() || selected.dataset.apiVersion || "v25.0",
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
  apiVersionEl.value = "v22.0";
  clearMetrics();
  setStatus("", "Cliente removido.");
  setMainNextStep("cadastre outro cliente ou selecione um existente.");
}

function clearMetrics() {
  kSpendEl.textContent = brMoney(0);
  kClicksEl.textContent = brInt(0);
  kLeadsEl.textContent = brInt(0);
  kCtrEl.textContent = "0,00%";
  kCpcEl.textContent = brMoney(0);
  kCplEl.textContent = brMoney(0);
  tableBodyEl.innerHTML = '<tr><td colspan="5">Sem dados ainda.</td></tr>';
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

function updateTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    tableBodyEl.innerHTML = '<tr><td colspan="5">Sem linhas para o periodo selecionado.</td></tr>';
    return;
  }
  tableBodyEl.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.campaign_name || "-"}</td>
      <td>${brMoney(row.spend)}</td>
      <td>${brInt(row.clicks)}</td>
      <td>${Number(row.ctr || 0).toFixed(2).replace(".", ",")}%</td>
      <td>${brInt(row.leads)}</td>
    </tr>
  `).join("");
}

async function loadMetrics() {
  const selected = clientSelectEl.options[clientSelectEl.selectedIndex];
  if (!selected || !selected.value) {
    setStatus("warn", "Salve e selecione um cliente antes de consultar.");
    setMainNextStep("selecione uma conta do token, preencha nome do cliente e salve.");
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
    apiVersion: apiVersionEl.value.trim() || selected.dataset.apiVersion || "v22.0",
    adAccountId: adAccountIdEl.value.trim() || selected.dataset.account || "",
    dateStart,
    dateEnd,
    reportType: reportTypeEl.value
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
  lastMetricsPayload = {
    clientName: selected.textContent.split(" - ")[0] || "Cliente",
    reportType: reportTypeEl.value,
    dateStart,
    dateEnd,
    metrics: result.data.summary || {},
    rows: result.data.rows || []
  };
  updateMetricsHistory(lastMetricsPayload);
  setStatus("ok", "Metricas atualizadas.");
  setMainNextStep("clique em Gerar dicas da IA.");
}

async function loadAdvice(extra = {}) {
  if (!lastMetricsPayload) {
    setStatus("warn", "Atualize metricas antes de pedir recomendacoes.");
    return;
  }
  adviceEl.textContent = "Gerando recomendacoes...";
  // Enviar todas as métricas detalhadas para a IA
  const payload = { ...lastMetricsPayload, ...extra };
  const result = await apiPost("/api/claude-helper", payload);
  if (!result.ok || !result.data.ok) {
    adviceEl.textContent = "Nao foi possivel gerar dicas agora.";
    setMainNextStep("faca login novamente ou tente mais tarde.");
    return;
  }
  const advice = result.data.advice || {};
  const recommendations = Array.isArray(advice.recommendations) ? advice.recommendations : [];
  adviceEl.textContent = [
    `Modo: ${result.data.mode || "fallback"}`,
    "",
    `Resumo: ${advice.summary || "-"}`,
    "",
    "Recomendações:",
    ...recommendations.map((item, index) => `${index + 1}. ${item}`),
    "",
    `Próxima ação: ${advice.nextAction || "-"}`
  ].join("\n");
  setMainNextStep("revise as recomendacoes e ajuste as campanhas.");
}

function bindEvents() {
      // Relatórios: troca de período rápido e datas
      const reportTab = document.getElementById("reportTab");
      const dateStartEl = document.getElementById("dateStart");
      const dateEndEl = document.getElementById("dateEnd");
      const customDateBox = document.getElementById("customDateBox");
      function setQuickPeriod(days) {
        const today = new Date();
        const end = today.toISOString().slice(0, 10);
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - (days - 1));
        const start = startDate.toISOString().slice(0, 10);
        if (dateStartEl) dateStartEl.value = start;
        if (dateEndEl) dateEndEl.value = end;
      }
      if (reportTab) {
        reportTab.addEventListener("change", () => {
          if (reportTab.value === "custom") {
            if (customDateBox) customDateBox.style.display = "flex";
          } else {
            if (customDateBox) customDateBox.style.display = "none";
            if (reportTab.value === "1d") setQuickPeriod(1);
            if (reportTab.value === "15d") setQuickPeriod(15);
            if (reportTab.value === "30d") setQuickPeriod(30);
          }
        });
        // Inicializa datas padrão
        setQuickPeriod(1);
        if (customDateBox) customDateBox.style.display = "none";
      }
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
    toggleAuthCard(signupCardEl, true);
    toggleAuthCard(loginCardEl, false);
    setEntryNextStep("preencha e-mail, senha forte e confirme a conta.");
  });
  document.getElementById("showLoginBtn").addEventListener("click", () => {
    toggleAuthCard(loginCardEl, true);
    toggleAuthCard(signupCardEl, false);
    setEntryNextStep("digite e-mail e senha para entrar.");
  });
  document.getElementById("openRecoverBtn").addEventListener("click", () => {
    showOnly(recoverScreenEl);
    setEntryNextStep("informe o e-mail e envie o link de recuperacao.");
  });
  document.getElementById("backToEntryBtn").addEventListener("click", () => {
    showOnly(entryScreenEl);
    setEntryNextStep("clique em Criar conta, Entrar ou Recuperar senha.");
  });
  document.getElementById("cancelSignupBtn").addEventListener("click", () => toggleAuthCard(signupCardEl, false));
  document.getElementById("cancelLoginBtn").addEventListener("click", () => toggleAuthCard(loginCardEl, false));
  document.getElementById("doSignupBtn").addEventListener("click", signUp);
  document.getElementById("doLoginBtn").addEventListener("click", signIn);
  document.getElementById("doRecoverBtn").addEventListener("click", sendRecoveryEmail);
  document.getElementById("doResetBtn").addEventListener("click", updateRecoveredPassword);
  document.getElementById("backToEntryFromResetBtn").addEventListener("click", () => {
    showOnly(entryScreenEl);
    setEntryNextStep("clique em Entrar com sua nova senha.");
  });
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("openPanelBtn").addEventListener("click", () => {
    if (!currentUser) {
      setEntryStatus("warn", "Entre antes de abrir o painel.");
      return;
    }
    showOnly(metricsAppEl);
    setStatus("ok", "Painel aberto.");
    setMainNextStep("salve o token Meta, cadastre um cliente e atualize as metricas.");
  });
  document.getElementById("saveTokenBtn").addEventListener("click", saveMetaToken);
  document.getElementById("deleteTokenBtn").addEventListener("click", deleteMetaToken);
  document.getElementById("saveClientBtn").addEventListener("click", saveClient);
  document.getElementById("removeClientBtn").addEventListener("click", removeClient);
  document.getElementById("loadMetricsBtn").addEventListener("click", loadMetrics);
  document.getElementById("loadAdviceBtn").addEventListener("click", loadAdvice);
  signupPasswordEl.addEventListener("input", () => updatePolicy(signupPasswordEl, signupPolicyEl));
  resetPasswordEl.addEventListener("input", () => updatePolicy(resetPasswordEl, resetPolicyEl));
  clientSelectEl.addEventListener("change", () => {
    const option = clientSelectEl.options[clientSelectEl.selectedIndex];
    if (!option || !option.value) return;
    clientNameEl.value = option.textContent.split(" - ")[0] || "";
    adAccountIdEl.value = option.dataset.account || "";
    apiVersionEl.value = option.dataset.apiVersion || "v22.0";
    clearMetrics();
    setMainNextStep("clique em Atualizar metricas para este cliente.");
  });
  availableAccountSelectEl.addEventListener("change", () => {
    const option = availableAccountSelectEl.options[availableAccountSelectEl.selectedIndex];
    if (!option || !option.value) return;
    adAccountIdEl.value = option.dataset.account || "";
    apiVersionEl.value = option.dataset.apiVersion || "v22.0";
    if (!clientNameEl.value.trim()) {
      clientNameEl.value = (option.textContent.split(" - ")[0] || "").trim();
    }
    setMainNextStep("confirme o nome do cliente e clique em Salvar cliente.");
  });
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
