const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

export type EmailAvailability = {
  email: string;
  available: boolean;
  valid: boolean;
  reason: 'available' | 'taken' | 'invalid' | 'empty' | 'too_long' | 'unchanged';
  message: string;
};

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** User-facing copy when an email is already linked to another profile. */
export function emailTakenMessage(email: string): string {
  const value = normalizeEmail(email);
  const quoted = value ? `"${value}"` : 'that address';
  return `The email ${quoted} is already in use. Sign in with that account or choose a different address.`;
}

export function validateEmailFormat(raw: string): EmailAvailability | null {
  const email = normalizeEmail(raw);
  if (!email) {
    return {
      email,
      available: false,
      valid: false,
      reason: 'empty',
      message:
        'Email is required. Each username must be linked to a unique email address.',
    };
  }
  if (email.length > EMAIL_MAX) {
    return {
      email,
      available: false,
      valid: false,
      reason: 'too_long',
      message: `Email must be at most ${EMAIL_MAX} characters.`,
    };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return {
      email,
      available: false,
      valid: false,
      reason: 'invalid',
      message: 'Enter a valid email address.',
    };
  }
  return null;
}
