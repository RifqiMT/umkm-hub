/**
 * Regenerates apps/mobile/lib/glossary/glossary_catalog.dart from the web catalog.
 * Run: npx tsx scripts/sync-glossary-mobile.ts
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GLOSSARY_ENTRIES } from '../apps/web/src/lib/glossary/catalog';
import {
  GLOSSARY_PAGE_INTRO,
  GLOSSARY_SECTION_INTROS,
} from '../apps/web/src/lib/glossary/sections';
import { GLOSSARY_FEATURES } from '../apps/web/src/lib/glossary/types';

function dartString(value: string): string {
  return `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')}'`;
}

function featureEnum(feature: string): string {
  return `GlossaryFeature.${feature}`;
}

const introCases = GLOSSARY_FEATURES.map(
  (f) => `      case GlossaryFeature.${f}:
        return ${dartString(GLOSSARY_SECTION_INTROS[f])};`,
).join('\n');

const labelCases = GLOSSARY_FEATURES.map((f) => {
  const label =
    f.charAt(0).toUpperCase() + f.slice(1).replace(/([A-Z])/g, ' $1');
  // Use known labels from web types
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    products: 'Products',
    warehouse: 'Warehouse',
    customers: 'Customers',
    orders: 'Orders',
    targets: 'Targets',
    analytics: 'Analytics',
  };
  return `      case GlossaryFeature.${f}:
        return ${dartString(labels[f] ?? label)};`;
}).join('\n');

const entries = GLOSSARY_ENTRIES.map((entry) => {
  const features = entry.features.map(featureEnum).join(', ');
  const lines = [
    `    id: ${dartString(entry.id)},`,
    `    label: ${dartString(entry.label)},`,
    `    description:`,
    `        ${dartString(entry.description)},`,
  ];
  if (entry.formula) {
    lines.push(`    formula: ${dartString(entry.formula)},`);
  }
  lines.push(`    features: [${features}],`);
  if (entry.aliases && entry.aliases.length > 0) {
    lines.push(
      `    aliases: [${entry.aliases.map(dartString).join(', ')}],`,
    );
  }
  return `  GlossaryEntry(\n${lines.join('\n')}\n  )`;
}).join(',\n');

const dart = `// GENERATED FILE. Do not edit by hand.
// Source: apps/web/src/lib/glossary/{catalog,sections,types}.ts
// Regenerate: npx tsx scripts/sync-glossary-mobile.ts

enum GlossaryFeature {
  dashboard,
  products,
  warehouse,
  customers,
  orders,
  targets,
  analytics,
}

extension GlossaryFeatureLabel on GlossaryFeature {
  String get label {
    switch (this) {
${labelCases}
    }
  }

  String get intro {
    switch (this) {
${introCases}
    }
  }
}

const glossaryPageIntro =
    ${dartString(GLOSSARY_PAGE_INTRO)};

class GlossaryEntry {
  const GlossaryEntry({
    required this.id,
    required this.label,
    required this.description,
    this.formula,
    required this.features,
    this.aliases = const [],
  });

  final String id;
  final String label;
  final String description;
  final String? formula;
  final List<GlossaryFeature> features;
  final List<String> aliases;
}

const glossaryEntries = <GlossaryEntry>[
${entries},
];

List<GlossaryEntry> searchGlossary(
  String query, {
  GlossaryFeature? feature,
}) {
  final q = query.trim().toLowerCase();
  return glossaryEntries.where((entry) {
    if (feature != null && !entry.features.contains(feature)) return false;
    if (q.isEmpty) return true;
    final haystack = [
      entry.id,
      entry.label,
      entry.description,
      entry.formula ?? '',
      ...entry.aliases,
      ...entry.features.map((f) => f.label),
      if (feature != null) feature.intro,
    ].join(' ').toLowerCase();
    return haystack.contains(q);
  }).toList();
}

List<({GlossaryFeature feature, List<GlossaryEntry> entries})>
    groupGlossaryByFeature(List<GlossaryEntry> entries) {
  return GlossaryFeature.values
      .map(
        (feature) => (
          feature: feature,
          entries: entries
              .where((entry) => entry.features.contains(feature))
              .toList(),
        ),
      )
      .where((group) => group.entries.isNotEmpty)
      .toList();
}
`;

const out = resolve(
  process.cwd(),
  'apps/mobile/lib/glossary/glossary_catalog.dart',
);
writeFileSync(out, dart, 'utf8');
console.log(
  `Wrote ${GLOSSARY_ENTRIES.length} glossary entries → ${out}`,
);
