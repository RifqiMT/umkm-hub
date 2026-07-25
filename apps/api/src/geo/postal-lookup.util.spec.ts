import {
  parseNominatimHit,
  parseZippopotamPlaces,
} from './postal-lookup.util';

describe('postal-lookup.util', () => {
  it('parses Nominatim Indonesia postcode details', () => {
    const parsed = parseNominatimHit({
      display_name:
        '10110, Gambir, Jakarta Pusat, Daerah Khusus Ibukota Jakarta, Indonesia',
      address: {
        postcode: '10110',
        suburb: 'Gambir',
        city: 'Jakarta Pusat',
        country: 'Indonesia',
      },
    });
    expect(parsed.address).toBe('Gambir');
    expect(parsed.city).toBe('Jakarta Pusat');
    expect(parsed.province).toBe('Daerah Khusus Ibukota Jakarta');
  });

  it('parses Nominatim when state is present', () => {
    const parsed = parseNominatimHit({
      address: {
        road: 'Main Street',
        city: 'Springfield',
        state: 'Illinois',
      },
    });
    expect(parsed).toEqual({
      address: 'Main Street',
      city: 'Springfield',
      province: 'Illinois',
    });
  });

  it('parses Zippopotam places', () => {
    expect(
      parseZippopotamPlaces([
        { 'place name': 'Beverly Hills', state: 'California' },
      ]),
    ).toEqual({
      address: '',
      city: 'Beverly Hills',
      province: 'California',
    });
  });
});
