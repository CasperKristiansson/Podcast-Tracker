import { createHash, randomBytes } from "node:crypto";

const BASE64_URL_REPLACEMENTS: [RegExp, string][] = [
  [/\+/g, "-"],
  [/\//g, "_"],
  [/=+$/g, ""],
];

const toBase64Url = (value: Buffer): string => {
  const base = value.toString("base64");
  return BASE64_URL_REPLACEMENTS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    base
  );
};

export const createVerifier = (length = 96): string => {
  const bytes = randomBytes(length);
  return toBase64Url(bytes).slice(0, 128);
};

export const createChallenge = (verifier: string): string => {
  const digest = createHash("sha256").update(verifier).digest();
  return toBase64Url(digest);
};

export const createState = (): string => {
  return toBase64Url(randomBytes(24));
};
