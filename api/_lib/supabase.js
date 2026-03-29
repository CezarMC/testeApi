const { createClient } = require("@supabase/supabase-js");

function getEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} não configurada.`);
  }
  return value;
}

function createAnonClient() {
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function createAdminClient() {
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function getAuthenticatedUser(request) {
  const authHeader = request.headers.authorization || request.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return { user: null, token: "" };
  }
  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, token };
  }
  return { user: data.user, token };
}

module.exports = {
  createAnonClient,
  createAdminClient,
  getAuthenticatedUser,
  getEnv
};
