import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  GOOGLE_TRANSLATE_SOURCE_LANG,
  googleTranslateMany,
} from './google-translate.client';

const MAX_TEXTS = 40;
const MAX_TEXT_LEN = 500;

@Injectable()
export class TranslateService {
  /** Batch translate UI copy via Google Translate. */
  async translateBatch(
    to: string,
    texts: string[],
  ): Promise<{ translations: string[]; provider: 'google-translate' }> {
    const target = to.trim();
    if (!target || target === GOOGLE_TRANSLATE_SOURCE_LANG) {
      throw new BadRequestException('Target language is required.');
    }

    const normalized = texts.map((text) => text.trim()).filter(Boolean);
    if (normalized.length === 0) {
      throw new BadRequestException('At least one non-empty text is required.');
    }
    if (normalized.length > MAX_TEXTS) {
      throw new BadRequestException(`At most ${MAX_TEXTS} texts per request.`);
    }
    if (normalized.some((text) => text.length > MAX_TEXT_LEN)) {
      throw new BadRequestException(
        `Each text must be at most ${MAX_TEXT_LEN} characters.`,
      );
    }

    const translations = await googleTranslateMany(normalized, target);
    return { translations, provider: 'google-translate' };
  }
}
