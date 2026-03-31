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
// ...existing code...
