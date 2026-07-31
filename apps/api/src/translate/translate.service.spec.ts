import { BadGatewayException } from '@nestjs/common';
import {
  googleTranslateMany,
  googleTranslateOne,
} from './google-translate.client';
import { TranslateService } from './translate.service';

describe('google-translate.client', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses a Google Translate GTX payload', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [[['Dasbor', 'Dashboard', null, null, 2]]],
    } as Response);

    await expect(googleTranslateOne('Dashboard', 'id')).resolves.toBe('Dasbor');
  });

  it('translates batches in parallel', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      const translated = url.includes('Dashboard') ? 'Dasbor' : 'Produk';
      return {
        ok: true,
        json: async () => [[ [translated, 'source', null, null, 2] ]],
      } as Response;
    });

    const result = await googleTranslateMany(['Dashboard', 'Products'], 'id', 'en', 2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual(['Dasbor', 'Produk']);
  });

  it('throws when Google response is malformed', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await expect(googleTranslateOne('Hello', 'id')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});

describe('TranslateService', () => {
  const service = new TranslateService();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns Google Translate provider metadata', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [[['Dasbor', 'Dashboard', null, null, 2]]],
    } as Response);

    const result = await service.translateBatch('id', ['Dashboard']);
    expect(result.translations).toEqual(['Dasbor']);
    expect(result.provider).toBe('google-translate');
  });
});
