const { createAdminClient, getAuthenticatedUser } = require("./_lib/supabase");
const { encryptText, decryptText } = require("./_lib/crypto");
const { json, parseJsonBody } = require("./_lib/http");

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

  const action = String(body.action || "").trim();
  const admin = createAdminClient();

  if (action === "status") {
    const { data, error } = await admin
      .from("user_meta_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return json(response, 500, { error: "Erro ao consultar token.", detail: error.message });
    }

    return json(response, 200, { ok: true, configured: Boolean(data) });
  }

  if (action === "save") {
    const token = String(body.token || "").trim();
    if (!token || token.length < 20 || /\s/.test(token)) {
      return json(response, 400, { error: "Token Meta invalido. Verifique e tente novamente." });
    }

    const encryptedToken = encryptText(token);
    const { error } = await admin.from("user_meta_tokens").upsert({
      user_id: user.id,
      encrypted_token: encryptedToken,
      updated_at: new Date().toISOString()
    });

    if (error) {
      return json(response, 500, { error: "Erro ao salvar token.", detail: error.message });
    }

    return json(response, 200, { ok: true, message: "Token salvo com segurança." });
  }

  if (action === "delete") {
    const { error } = await admin.from("user_meta_tokens").delete().eq("user_id", user.id);
    if (error) {
      return json(response, 500, { error: "Erro ao remover token.", detail: error.message });
    }
    return json(response, 200, { ok: true, message: "Token removido." });
  }

  if (action === "accounts") {
    const apiVersion = /^v\d+\.\d+$/.test(String(body.apiVersion || "")) ? String(body.apiVersion) : "v25.0";
    const { data: tokenRow, error: tokenError } = await admin
      .from("user_meta_tokens")
      .select("encrypted_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tokenError) {
      return json(response, 500, { error: "Erro ao recuperar token Meta.", detail: tokenError.message });
    }
    if (!tokenRow) {
      return json(response, 403, { error: "Token Meta nao configurado. Salve o token primeiro." });
    }

    const accessToken = decryptText(tokenRow.encrypted_token);
    const params = new URLSearchParams();
    params.set("fields", "id,account_id,name,account_status");
    params.set("limit", "200");
    params.set("access_token", accessToken);
    const url = `https://graph.facebook.com/${apiVersion}/me/adaccounts?${params.toString()}`;

    try {
      const metaResponse = await fetch(url);
      const metaData = await metaResponse.json();
      if (!metaResponse.ok) {
        return json(response, metaResponse.status, { error: "Erro na Meta API", detail: metaData });
      }

      const accounts = Array.isArray(metaData.data) ? metaData.data : [];
      return json(response, 200, {
        ok: true,
        accounts: accounts.map((item) => ({
          id: String(item.id || "").replace(/^act_/, ""),
          actId: String(item.id || ""),
          accountId: String(item.account_id || ""),
          name: String(item.name || "Conta sem nome"),
          accountStatus: item.account_status ?? null
        }))
      });
    } catch (error) {
      return json(response, 502, { error: "Falha de rede ao listar contas da Meta.", detail: error.message });
    }
  }

  return json(response, 400, { error: "Ação inválida. Use save, status, delete ou accounts." });
};
