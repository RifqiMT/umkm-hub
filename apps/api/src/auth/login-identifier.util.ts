/** True when the login identifier looks like an email address. */
export function isEmailLoginIdentifier(value: string): boolean {
  const trimmed = value.trim();
  // Practical check — full RFC validation is enforced when saving email on Profile.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function normalizeLoginIdentifier(value: string): string {
  const trimmed = value.trim();
  if (isEmailLoginIdentifier(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}
