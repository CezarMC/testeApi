const crypto = require("crypto");

const ALGO = "aes-256-gcm";

function getEncKey() {
  const key = String(process.env.ENCRYPTION_KEY || "").trim();
  if (key.length !== 64) {
    throw new Error("ENCRYPTION_KEY inválida. Use 64 caracteres hexadecimais.");
  }
  return Buffer.from(key, "hex");
}

function encryptText(plainText) {
  const encKey = getEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, encKey, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decryptText(cipherText) {
  const encKey = getEncKey();
  const buffer = Buffer.from(cipherText, "base64");
  if (buffer.length < 29) {
    throw new Error("Texto cifrado inválido.");
  }
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, encKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

module.exports = {
  encryptText,
  decryptText
};
