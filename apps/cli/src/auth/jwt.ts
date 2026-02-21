import type { JwtPayload } from "../types.js";

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
};

export const decodeJwtPayload = (token: string): JwtPayload => {
  const parts = token.split(".");
  const payloadPart = parts[1];
  if (!payloadPart) {
    throw new Error("Invalid JWT format.");
  }

  const json = decodeBase64Url(payloadPart);
  const payload = JSON.parse(json) as JwtPayload;
  return payload;
};

export const getJwtExpiry = (token: string): number => {
  const payload = decodeJwtPayload(token);
  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    throw new Error("JWT does not include a valid exp claim.");
  }
  return payload.exp * 1000;
};

export const isApprovedUser = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  const approved = payload["custom:approved"];
  return (
    approved === true ||
    approved === "true" ||
    approved === 1 ||
    approved === "1"
  );
};
