const { json } = require("./_lib/http");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    return json(response, 405, { error: "Use GET." });
  }

  return json(response, 200, {
    ok: true,
    config: {
      supabaseUrlConfigured: Boolean(process.env.SUPABASE_URL),
      supabaseAnonKeyConfigured: Boolean(process.env.SUPABASE_ANON_KEY),
      supabaseServiceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      encryptionConfigured: Boolean(process.env.ENCRYPTION_KEY && String(process.env.ENCRYPTION_KEY).trim().length === 64),
      anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY)
    },
    publicConfig: {
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ""
    }
  });
};
