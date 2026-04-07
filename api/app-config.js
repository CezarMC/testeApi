const { json } = require("./_lib/http");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    return json(response, 405, { error: "Use GET." });
  }

  return json(response, 200, {
    ok: true,
    supportedAiProviders: ["anthropic", "openai", "gemini"],
    availableAiProviders: [
      Boolean(process.env.ANTHROPIC_API_KEY) ? "anthropic" : null,
      Boolean(process.env.OPENAI_API_KEY) ? "openai" : null,
      Boolean(process.env.GEMINI_API_KEY) ? "gemini" : null
    ].filter(Boolean),
    config: {
      supabaseUrlConfigured: Boolean(process.env.SUPABASE_URL),
      supabaseAnonKeyConfigured: Boolean(process.env.SUPABASE_ANON_KEY),
      supabaseServiceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      encryptionConfigured: Boolean(process.env.ENCRYPTION_KEY && String(process.env.ENCRYPTION_KEY).trim().length === 64),
      anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      metaAppConfigured: Boolean(process.env.META_APP_ID)
    },
    publicConfig: {
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
      metaAppId: process.env.META_APP_ID || "",
      metaApiVersion: process.env.META_API_VERSION || "v25.0",
      supportedAiProviders: ["anthropic", "openai", "gemini"],
      availableAiProviders: [
        Boolean(process.env.ANTHROPIC_API_KEY) ? "anthropic" : null,
        Boolean(process.env.OPENAI_API_KEY) ? "openai" : null,
        Boolean(process.env.GEMINI_API_KEY) ? "gemini" : null
      ].filter(Boolean)
    }
  });
};
