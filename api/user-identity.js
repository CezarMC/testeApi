const crypto = require("crypto");
const { createAdminClient, getAuthenticatedUser } = require("./_lib/supabase");
const { json, parseJsonBody } = require("./_lib/http");

function normalizeDocument(value) {
  return String(value || "").replace(/\D/g, "");
}

function allDigitsEqual(value) {
  return /^(\d)\1+$/.test(value);
}

function isValidCpf(cpf) {
  if (!/^\d{11}$/.test(cpf) || allDigitsEqual(cpf)) return false;
  const calc = (base, factor) => {
    let total = 0;
    for (let i = 0; i < base.length; i += 1) {
      total += Number(base[i]) * (factor - i);
    }
    const mod = (total * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

function isValidCnpj(cnpj) {
  if (!/^\d{14}$/.test(cnpj) || allDigitsEqual(cnpj)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calcDigit = (base, weights) => {
    const total = base.split("").reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calcDigit(cnpj.slice(0, 12), weights1);
  const d2 = calcDigit(cnpj.slice(0, 13), weights2);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

function parseDocument(raw) {
  const normalized = normalizeDocument(raw);
  if (normalized.length === 11 && isValidCpf(normalized)) {
    return { ok: true, normalized, type: "cpf", last4: normalized.slice(-4) };
  }
  if (normalized.length === 14 && isValidCnpj(normalized)) {
    return { ok: true, normalized, type: "cnpj", last4: normalized.slice(-4) };
  }
  return { ok: false, normalized, type: "", last4: "" };
}

function hashDocument(normalized) {
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, 405, { error: "Use POST." });
  }

  let body;
  try {
    body = await parseJsonBody(request);
  } catch (error) {
    return json(response, 400, { error: error.message });
  }

  const action = String(body.action || "").trim();
  const doc = parseDocument(body.document || "");
  if (!doc.ok) {
    return json(response, 400, { error: "Informe um CPF ou CNPJ valido." });
  }

  const admin = createAdminClient();

  if (action === "check") {
    const docHash = hashDocument(doc.normalized);
    const { data, error } = await admin
      .from("user_identities")
      .select("user_id")
      .eq("document_hash", docHash)
      .maybeSingle();

    if (error) {
      return json(response, 500, { error: "Erro ao validar documento.", detail: error.message });
    }

    return json(response, 200, {
      ok: true,
      available: !data,
      type: doc.type
    });
  }

  if (action === "register") {
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return json(response, 401, { error: "Login necessario." });
    }

    const docHash = hashDocument(doc.normalized);

    const { data: existing, error: existingError } = await admin
      .from("user_identities")
      .select("user_id")
      .eq("document_hash", docHash)
      .maybeSingle();

    if (existingError) {
      return json(response, 500, { error: "Erro ao validar documento.", detail: existingError.message });
    }

    if (existing && existing.user_id !== user.id) {
      return json(response, 409, { error: "CPF/CNPJ ja cadastrado em outra conta." });
    }

    const payload = {
      user_id: user.id,
      document_type: doc.type,
      document_hash: docHash,
      document_last4: doc.last4,
      updated_at: new Date().toISOString()
    };

    const { error } = await admin
      .from("user_identities")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      return json(response, 500, { error: "Erro ao salvar documento.", detail: error.message });
    }

    return json(response, 200, { ok: true, type: doc.type });
  }

  return json(response, 400, { error: "Acao invalida. Use check ou register." });
};