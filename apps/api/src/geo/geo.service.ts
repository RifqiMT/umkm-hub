import { Injectable, Logger } from '@nestjs/common';
import { countryCodeFromName } from './country-codes';
import {
  parseNominatimHit,
  parseZippopotamPlaces,
  type PostalLookupResult,
} from './postal-lookup.util';

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  async lookupPostal(
    country: string,
    postalCode: string,
  ): Promise<PostalLookupResult> {
    const trimmedCountry = country.trim();
    const trimmedPostal = postalCode.trim();
    const countryCode = countryCodeFromName(trimmedCountry);

    const empty: PostalLookupResult = {
      found: false,
      postalCode: trimmedPostal,
      country: trimmedCountry,
      countryCode,
      address: '',
      city: '',
      province: '',
      source: null,
    };

    if (!trimmedCountry || !trimmedPostal) {
      return empty;
    }

    try {
      const nominatim = await this.lookupNominatim(
        trimmedCountry,
        countryCode,
        trimmedPostal,
      );
      if (nominatim.found) return nominatim;
    } catch (err) {
      this.logger.warn(
        `Nominatim postal lookup failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (countryCode) {
      try {
        const zip = await this.lookupZippopotam(countryCode, trimmedPostal);
        if (zip.found) {
          return {
            ...zip,
            country: trimmedCountry,
            countryCode,
          };
        }
      } catch (err) {
        this.logger.warn(
          `Zippopotam postal lookup failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return empty;
  }

  private async lookupNominatim(
    country: string,
    countryCode: string | null,
    postalCode: string,
  ): Promise<PostalLookupResult> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('postalcode', postalCode);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '1');
    if (countryCode) {
      url.searchParams.set('countrycodes', countryCode.toLowerCase());
    } else {
      url.searchParams.set('country', country);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'UMKM-Hub/1.5 (postal lookup; https://github.com/umkm-hub)',
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      throw new Error(`Nominatim HTTP ${res.status}`);
    }

    const data = (await res.json()) as unknown;
    const hit = Array.isArray(data) ? data[0] : null;
    if (!hit) {
      return {
        found: false,
        postalCode,
        country,
        countryCode,
        address: '',
        city: '',
        province: '',
        source: null,
      };
    }

    const parsed = parseNominatimHit(hit);
    const found = Boolean(parsed.city || parsed.province || parsed.address);
    return {
      found,
      postalCode,
      country,
      countryCode,
      address: parsed.address,
      city: parsed.city,
      province: parsed.province,
      source: found ? 'nominatim' : null,
    };
  }

  private async lookupZippopotam(
    countryCode: string,
    postalCode: string,
  ): Promise<PostalLookupResult> {
    const url = `https://api.zippopotam.us/${encodeURIComponent(countryCode)}/${encodeURIComponent(postalCode)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });

    if (res.status === 404) {
      return {
        found: false,
        postalCode,
        country: '',
        countryCode,
        address: '',
        city: '',
        province: '',
        source: null,
      };
    }

    if (!res.ok) {
      throw new Error(`Zippopotam HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      places?: Array<{
        'place name'?: string;
        state?: string;
      }>;
      country?: string;
    };

    const parsed = parseZippopotamPlaces(data.places);
    const found = Boolean(parsed.city || parsed.province);
    return {
      found,
      postalCode,
      country: data.country ?? '',
      countryCode,
      address: parsed.address,
      city: parsed.city,
      province: parsed.province,
      source: found ? 'zippopotam' : null,
    };
  }
}
