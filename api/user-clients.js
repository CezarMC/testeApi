const { createAdminClient, getAuthenticatedUser } = require("./_lib/supabase");
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

  if (action === "list") {
    const { data, error } = await admin
      .from("user_clients")
      .select("id, name, ad_account_id, api_version")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return json(response, 500, { error: "Erro ao listar clientes.", detail: error.message });
    }

    return json(response, 200, {
      ok: true,
      clients: (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        adAccountId: item.ad_account_id,
        apiVersion: item.api_version
      }))
    });
  }

  if (action === "save") {
    const client = body.client || {};
    const name = String(client.name || "").trim().slice(0, 100);
    const adAccountId = String(client.adAccountId || "").trim().replace(/^act_/, "");
    const apiVersion = /^v\d+\.\d+$/.test(String(client.apiVersion || "")) ? String(client.apiVersion) : "v25.0";
    const id = String(client.id || "").trim();

    if (!name || !adAccountId) {
      return json(response, 400, { error: "Nome e ID da conta são obrigatórios." });
    }
    if (!/^\d+$/.test(adAccountId)) {
      return json(response, 400, { error: "ID da conta deve conter apenas números." });
    }

    const payload = {
      ...(id ? { id } : {}),
      user_id: user.id,
      name,
      ad_account_id: adAccountId,
      api_version: apiVersion,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await admin
      .from("user_clients")
      .upsert(payload)
      .select("id, name, ad_account_id, api_version")
      .single();

    if (error) {
      return json(response, 500, { error: "Erro ao salvar cliente.", detail: error.message });
    }

    const { data: allClients } = await admin
      .from("user_clients")
      .select("id, name, ad_account_id, api_version")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    return json(response, 200, {
      ok: true,
      client: {
        id: data.id,
        name: data.name,
        adAccountId: data.ad_account_id,
        apiVersion: data.api_version
      },
      clients: (allClients || []).map((item) => ({
        id: item.id,
        name: item.name,
        adAccountId: item.ad_account_id,
        apiVersion: item.api_version
      }))
    });
  }

  if (action === "remove") {
    const clientId = String(body.clientId || "").trim();
    if (!clientId) {
      return json(response, 400, { error: "clientId obrigatório." });
    }

    const { error } = await admin.from("user_clients").delete().eq("user_id", user.id).eq("id", clientId);
    if (error) {
      return json(response, 500, { error: "Erro ao remover cliente.", detail: error.message });
    }

    const { data } = await admin
      .from("user_clients")
      .select("id, name, ad_account_id, api_version")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    return json(response, 200, {
      ok: true,
      clients: (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        adAccountId: item.ad_account_id,
        apiVersion: item.api_version
      }))
    });
  }

  return json(response, 400, { error: "Ação inválida. Use list, save ou remove." });
};
