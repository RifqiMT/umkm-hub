import { GLOSSARY_ENTRIES } from './catalog';
import {
  GLOSSARY_PAGE_INTRO,
  GLOSSARY_SECTION_INTROS,
} from './sections';
import {
  GLOSSARY_FEATURE_LABELS,
  GLOSSARY_FEATURES,
  type GlossaryEntry,
  type GlossaryFeature,
} from './types';

export {
  GLOSSARY_ENTRIES,
  GLOSSARY_FEATURE_LABELS,
  GLOSSARY_FEATURES,
  GLOSSARY_PAGE_INTRO,
  GLOSSARY_SECTION_INTROS,
};
export type { GlossaryEntry, GlossaryFeature };

export function searchGlossary(
  query: string,
  feature: GlossaryFeature | 'all' = 'all',
): GlossaryEntry[] {
  const q = query.trim().toLowerCase();
  return GLOSSARY_ENTRIES.filter((entry) => {
    if (feature !== 'all' && !entry.features.includes(feature)) return false;
    if (!q) return true;
    const haystack = [
      entry.id,
      entry.label,
      entry.description,
      entry.formula ?? '',
      ...(entry.aliases ?? []),
      ...entry.features.map((f) => GLOSSARY_FEATURE_LABELS[f]),
      feature === 'all'
        ? ''
        : GLOSSARY_SECTION_INTROS[feature as GlossaryFeature],
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** Group entries under each feature they belong to (stable feature order). */
export function groupGlossaryByFeature(
  entries: GlossaryEntry[],
): Array<{ feature: GlossaryFeature; intro: string; entries: GlossaryEntry[] }> {
  return GLOSSARY_FEATURES.map((feature) => ({
    feature,
    intro: GLOSSARY_SECTION_INTROS[feature],
    entries: entries.filter((entry) => entry.features.includes(feature)),
  })).filter((group) => group.entries.length > 0);
}
