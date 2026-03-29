const { json } = require("./_lib/http");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    return json(response, 405, { error: "Use GET." });
  }

  return json(response, 200, {
    ok: true,
    service: "aopa-vercel-supabase",
    timestamp: new Date().toISOString()
  });
};
