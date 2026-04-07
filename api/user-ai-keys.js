const { createAdminClient, getAuthenticatedUser } = require("./_lib/supabase");
const { encryptText } = require("./_lib/crypto");
const { json, parseJsonBody } = require("./_lib/http");

const SUPPORTED_PROVIDERS = ["anthropic", "openai", "gemini"];

function normalizeProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  return SUPPORTED_PROVIDERS.includes(provider) ? provider : "";
}

function getServerConfiguredProviders() {
  return [
    String(process.env.ANTHROPIC_API_KEY || "").trim() ? "anthropic" : null,
    String(process.env.OPENAI_API_KEY || "").trim() ? "openai" : null,
    String(process.env.GEMINI_API_KEY || "").trim() ? "gemini" : null
  ].filter(Boolean);
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

  const action = String(body.action || "").trim().toLowerCase();
  const provider = normalizeProvider(body.provider);
  const admin = createAdminClient();

  if (action === "status") {
    const { data, error } = await admin
      .from("user_ai_keys")
      .select("provider, updated_at")
      .eq("user_id", user.id);

    if (error) {
      return json(response, 500, { error: "Erro ao consultar chaves de IA.", detail: error.message });
    }

    return json(response, 200, {
      ok: true,
      supportedProviders: SUPPORTED_PROVIDERS,
      serverConfiguredProviders: getServerConfiguredProviders(),
      userConfiguredProviders: Array.isArray(data) ? data.map((item) => item.provider) : [],
      items: Array.isArray(data) ? data : []
    });
  }

  if (!provider) {
    return json(response, 400, { error: "Provedor inválido. Use anthropic, openai ou gemini." });
  }

  if (action === "save") {
    const apiKey = String(body.apiKey || "").trim();
    if (apiKey.length < 12) {
      return json(response, 400, { error: "Key inválida. Verifique e tente novamente." });
    }

    const encryptedKey = encryptText(apiKey);
    const { error } = await admin
      .from("user_ai_keys")
      .upsert({
        user_id: user.id,
        provider,
        encrypted_key: encryptedKey,
        updated_at: new Date().toISOString()
      });

    if (error) {
      return json(response, 500, { error: "Erro ao salvar key da IA.", detail: error.message });
    }

    return json(response, 200, { ok: true, message: "Key salva com segurança.", provider });
  }

  if (action === "delete") {
    const { error } = await admin
      .from("user_ai_keys")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    if (error) {
      return json(response, 500, { error: "Erro ao remover key da IA.", detail: error.message });
    }

    return json(response, 200, { ok: true, message: "Key removida.", provider });
  }

  return json(response, 400, { error: "Ação inválida. Use status, save ou delete." });
};