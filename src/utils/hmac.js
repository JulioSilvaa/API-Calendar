import crypto from "crypto";

export function signBodyHmacSHA256(bodyString, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(bodyString, "utf8")
    .digest("hex");
}

export function verifyBodyHmacSHA256(bodyString, secret, signature) {
  const expected = signBodyHmacSHA256(bodyString, secret);
  // timing-safe compare
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || "");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
