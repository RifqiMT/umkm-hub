type IpLocationResult = {
  found: boolean;
  city: string;
  country: string;
  message?: string;
};

const PRIVATE_IP_RE =
  /^(::1|::ffff:127\.|127\.|10\.|192\.168\.|169\.254\.|fc|fd|fe80:)/i;

/** True for loopback / RFC1918 / link-local addresses (cannot geo-resolve reliably). */
export function isPrivateOrLocalIp(ip: string): boolean {
  const trimmed = ip.trim().toLowerCase();
  if (!trimmed) return true;
  if (trimmed === 'localhost') return true;
  // Strip IPv4-mapped IPv6 prefix for classification.
  const bare = trimmed.startsWith('::ffff:')
    ? trimmed.slice('::ffff:'.length)
    : trimmed;
  if (PRIVATE_IP_RE.test(trimmed) || PRIVATE_IP_RE.test(bare)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(bare)) return true;
  return false;
}

/**
 * Pick the first public client IP from proxy headers / Express `req.ip`.
 * Does not store the IP — callers use it only for a one-shot geo lookup.
 */
export function extractClientIp(input: {
  forwardedFor?: string | string[] | undefined;
  realIp?: string | string[] | undefined;
  remoteAddress?: string | undefined;
}): string | null {
  const candidates: string[] = [];
  const push = (value: string | string[] | undefined) => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const part of value) push(part);
      return;
    }
    for (const part of value.split(',')) {
      const ip = part.trim();
      if (ip) candidates.push(ip);
    }
  };
  push(input.forwardedFor);
  push(input.realIp);
  if (input.remoteAddress) candidates.push(input.remoteAddress.trim());

  for (const ip of candidates) {
    if (!isPrivateOrLocalIp(ip)) return ip;
  }
  return candidates[0] ?? null;
}

type IpApiCoResponse = {
  error?: boolean;
  reason?: string;
  city?: string | null;
  country_name?: string | null;
  country?: string | null;
};

/**
 * Resolve city + country for an IP via ipapi.co (no API key; timeout-bounded).
 * Never persists the IP — only city/country strings are returned.
 */
export async function lookupIpLocation(
  ip: string,
  fetchImpl: typeof fetch = fetch,
): Promise<IpLocationResult> {
  const trimmed = ip.trim();
  if (!trimmed) {
    return { found: false, city: '', country: '', message: 'No client IP.' };
  }
  if (isPrivateOrLocalIp(trimmed)) {
    return {
      found: false,
      city: '',
      country: '',
      message:
        'Location cannot be detected on a local or private network. Enter city and country manually.',
    };
  }

  const url = `https://ipapi.co/${encodeURIComponent(trimmed)}/json/`;
  try {
    const res = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'UMKM-Hub/1.5 (profile location; https://github.com/umkm-hub)',
      },
      signal: AbortSignal.timeout(2_500),
    });
    if (!res.ok) {
      return {
        found: false,
        city: '',
        country: '',
        message: `Location lookup failed (HTTP ${res.status}).`,
      };
    }
    const data = (await res.json()) as IpApiCoResponse;
    if (data.error) {
      return {
        found: false,
        city: '',
        country: '',
        message: data.reason || 'Location lookup was refused.',
      };
    }
    const city = (data.city ?? '').trim();
    const country = (data.country_name ?? data.country ?? '').trim();
    if (!city && !country) {
      return {
        found: false,
        city: '',
        country: '',
        message: 'No city or country found for this network.',
      };
    }
    return { found: true, city, country };
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'TimeoutError'
        ? 'Location lookup timed out. Try again or enter location manually.'
        : 'Location lookup failed. Try again or enter location manually.';
    return { found: false, city: '', country: '', message };
  }
}
