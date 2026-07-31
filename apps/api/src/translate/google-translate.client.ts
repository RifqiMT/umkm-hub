import { BadGatewayException } from '@nestjs/common';

/** English is the product source language across web and mobile. */
export const GOOGLE_TRANSLATE_SOURCE_LANG = 'en';

/** Unofficial Google Translate endpoint used by the GTX web client. */
const GOOGLE_TRANSLATE_GTX_URL =
  'https://translate.googleapis.com/translate_a/single';

/** Parallel in-flight requests — balances speed vs provider rate limits. */
const GOOGLE_TRANSLATE_CONCURRENCY = 10;

type GoogleTranslateResponse = unknown;

function extractTranslation(payload: GoogleTranslateResponse): string {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    throw new BadGatewayException('Unexpected Google Translate response.');
  }

  const segments = payload[0] as unknown[];
  return segments
    .map((segment) =>
      Array.isArray(segment) && typeof segment[0] === 'string'
        ? segment[0]
        : '',
    )
    .join('');
}

export async function googleTranslateOne(
  text: string,
  to: string,
  from: string = GOOGLE_TRANSLATE_SOURCE_LANG,
): Promise<string> {
  const url = new URL(GOOGLE_TRANSLATE_GTX_URL);
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', from);
  url.searchParams.set('tl', to.trim());
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'UMKM-Hub/1.0 (Google Translate)' },
    });
  } catch {
    throw new BadGatewayException('Google Translate is unreachable.');
  }

  if (!response.ok) {
    throw new BadGatewayException(
      `Google Translate returned HTTP ${response.status}.`,
    );
  }

  const payload = (await response.json()) as GoogleTranslateResponse;
  return extractTranslation(payload);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]!, index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/** Translate many strings via Google Translate (one provider call per string). */
export async function googleTranslateMany(
  texts: string[],
  to: string,
  from: string = GOOGLE_TRANSLATE_SOURCE_LANG,
  concurrency: number = GOOGLE_TRANSLATE_CONCURRENCY,
): Promise<string[]> {
  return mapWithConcurrency(texts, concurrency, (text) =>
    googleTranslateOne(text, to, from),
  );
}
