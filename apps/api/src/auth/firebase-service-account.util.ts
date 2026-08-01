/** Parse Firebase service account JSON from Render/Vercel env (trim, unwrap quotes). */
export function parseFirebaseServiceAccountJson(raw: string): Record<string, unknown> {
  let value = raw.trim();
  if (!value) {
    throw new Error('Empty FIREBASE_SERVICE_ACCOUNT_JSON');
  }

  // Render dashboard sometimes wraps the whole blob in extra quotes.
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') &&
      value.endsWith('"') &&
      !value.startsWith('{"'))
  ) {
    value = value.slice(1, -1).trim();
  }

  return JSON.parse(value) as Record<string, unknown>;
}
