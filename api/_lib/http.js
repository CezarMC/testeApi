function json(response, statusCode, payload) {
  response.status(statusCode).setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.send(JSON.stringify(payload));
}

async function parseJsonBody(request) {
  if (!request.body) return {};
  if (typeof request.body === "object") return request.body;
  try {
    return JSON.parse(request.body);
  } catch (_) {
    throw new Error("JSON inválido.");
  }
}

module.exports = {
  json,
  parseJsonBody
};
