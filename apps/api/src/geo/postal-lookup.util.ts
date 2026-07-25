export type PostalLookupResult = {
  found: boolean;
  postalCode: string;
  country: string;
  countryCode: string | null;
  address: string;
  city: string;
  province: string;
  source: 'nominatim' | 'zippopotam' | null;
};

type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  hamlet?: string;
  city_district?: string;
  city?: string;
  town?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  region?: string;
  province?: string;
  postcode?: string;
  country?: string;
};

type NominatimHit = {
  display_name?: string;
  address?: NominatimAddress;
};

type ZippopotamPlace = {
  'place name'?: string;
  state?: string;
  'state abbreviation'?: string;
};

function firstNonEmpty(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

/** Build address / city / province from Nominatim address details. */
export function parseNominatimHit(hit: NominatimHit): {
  address: string;
  city: string;
  province: string;
} {
  const a = hit.address ?? {};
  const address = firstNonEmpty(
    a.road,
    a.pedestrian,
    a.neighbourhood,
    a.suburb,
    a.village,
    a.hamlet,
  );
  const city = firstNonEmpty(
    a.city,
    a.town,
    a.municipality,
    a.city_district,
    a.village,
    a.county,
  );
  let province = firstNonEmpty(
    a.state,
    a.province,
    a.region,
    a.state_district,
    a.county,
  );

  // Fallback: parse display_name "…, city, province, Country"
  if ((!city || !province || !address) && hit.display_name) {
    const parts = hit.display_name
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    // drop trailing country and leading postcode-ish token
    const useful = parts.slice(0, -1).filter((p) => !/^\d[\d\s-]*$/.test(p));
    if (!address && useful[0]) {
      // keep as-is below via assignment only if still empty
    }
    if (!province && useful.length >= 2) {
      province = useful[useful.length - 1] ?? '';
    }
    const cityIdx = useful.length >= 3 ? useful.length - 2 : useful.length - 1;
    const parsedCity = useful[cityIdx] ?? '';
    const parsedAddress =
      useful.length >= 3 ? useful.slice(0, cityIdx).join(', ') : '';
    return {
      address: address || parsedAddress,
      city: city || parsedCity,
      province,
    };
  }

  return { address, city, province };
}

export function parseZippopotamPlaces(
  places: ZippopotamPlace[] | undefined,
): { address: string; city: string; province: string } {
  const place = places?.[0];
  if (!place) return { address: '', city: '', province: '' };
  const city = place['place name']?.trim() ?? '';
  const province = place.state?.trim() ?? '';
  return {
    address: '',
    city,
    province,
  };
}
