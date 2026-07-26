const PROFILE_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const PROFILE_NAME_MIN = 3;
const PROFILE_NAME_MAX = 64;

export type ProfileNameAvailability = {
  profileName: string;
  available: boolean;
  valid: boolean;
  reason: 'available' | 'taken' | 'too_short' | 'too_long' | 'invalid_chars' | 'empty';
  message: string;
};

/** User-facing copy when a username is already registered. */
export function profileNameTakenMessage(
  profileName: string,
  options?: { suggestSignIn?: boolean },
): string {
  const name = profileName.trim();
  const quoted = name ? `"${name}"` : 'that username';
  const base = `The username ${quoted} is already taken. Choose a different username`;
  if (options?.suggestSignIn !== false) {
    return `${base}, or sign in if this is your account.`;
  }
  return `${base}.`;
}

/** Format validation before a DB lookup (shared by register + availability). */
export function validateProfileNameFormat(
  raw: string,
): ProfileNameAvailability | null {
  const profileName = raw.trim();
  if (!profileName) {
    return {
      profileName,
      available: false,
      valid: false,
      reason: 'empty',
      message: 'Enter a username.',
    };
  }
  if (profileName.length < PROFILE_NAME_MIN) {
    return {
      profileName,
      available: false,
      valid: false,
      reason: 'too_short',
      message: `Username must be at least ${PROFILE_NAME_MIN} characters.`,
    };
  }
  if (profileName.length > PROFILE_NAME_MAX) {
    return {
      profileName,
      available: false,
      valid: false,
      reason: 'too_long',
      message: `Username must be at most ${PROFILE_NAME_MAX} characters.`,
    };
  }
  if (!PROFILE_NAME_PATTERN.test(profileName)) {
    return {
      profileName,
      available: false,
      valid: false,
      reason: 'invalid_chars',
      message:
        'Username may only contain letters, numbers, dots, underscores, and hyphens.',
    };
  }
  return null;
}
