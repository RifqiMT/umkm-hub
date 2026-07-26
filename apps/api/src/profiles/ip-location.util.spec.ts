import {
  extractClientIp,
  isPrivateOrLocalIp,
  lookupIpLocation,
} from './ip-location.util';

describe('ip-location.util', () => {
  it('classifies private and loopback IPs', () => {
    expect(isPrivateOrLocalIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrLocalIp('::1')).toBe(true);
    expect(isPrivateOrLocalIp('10.0.0.8')).toBe(true);
    expect(isPrivateOrLocalIp('192.168.1.10')).toBe(true);
    expect(isPrivateOrLocalIp('172.16.0.1')).toBe(true);
    expect(isPrivateOrLocalIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateOrLocalIp('8.8.8.8')).toBe(false);
  });

  it('prefers the first public IP from x-forwarded-for', () => {
    expect(
      extractClientIp({
        forwardedFor: '203.0.113.10, 10.0.0.2',
        remoteAddress: '127.0.0.1',
      }),
    ).toBe('203.0.113.10');
  });

  it('falls back to private remote address when no public hop exists', () => {
    expect(extractClientIp({ remoteAddress: '127.0.0.1' })).toBe('127.0.0.1');
  });

  it('returns a clear message for private IPs without calling the network', async () => {
    let called = false;
    const result = await lookupIpLocation('127.0.0.1', async () => {
      called = true;
      throw new Error('should not fetch');
    });
    expect(called).toBe(false);
    expect(result.found).toBe(false);
    expect(result.message).toMatch(/local or private/i);
  });

  it('maps a successful ipapi.co payload', async () => {
    const result = await lookupIpLocation('203.0.113.50', async () =>
      new Response(
        JSON.stringify({
          city: 'Jakarta',
          country_name: 'Indonesia',
        }),
        { status: 200 },
      ),
    );
    expect(result).toEqual({
      found: true,
      city: 'Jakarta',
      country: 'Indonesia',
    });
  });

  it('handles provider error payloads', async () => {
    const result = await lookupIpLocation('203.0.113.50', async () =>
      new Response(
        JSON.stringify({ error: true, reason: 'RateLimited' }),
        { status: 200 },
      ),
    );
    expect(result.found).toBe(false);
    expect(result.message).toMatch(/RateLimited|refused/i);
  });
});
