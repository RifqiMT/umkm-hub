'use client';

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { EmptyState, PageHeader } from '@/components/PageHeader';
import { useTr } from '@/components/Tr';
import {
  GLOSSARY_FEATURE_LABELS,
  GLOSSARY_FEATURES,
  GLOSSARY_PAGE_INTRO,
  GLOSSARY_SECTION_INTROS,
  groupGlossaryByFeature,
  searchGlossary,
  type GlossaryEntry,
  type GlossaryFeature,
} from '@/lib/glossary';

type FeatureFilter = GlossaryFeature | 'all';

function previewText(description: string, max = 140): string {
  const text = description.trim().replace(/\s+/g, ' ');
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > 80 ? cut.slice(0, space) : cut).trim()}…`;
}

function sortByLabel(entries: GlossaryEntry[]): GlossaryEntry[] {
  return [...entries].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );
}

function alsoOnLabels(
  entry: GlossaryEntry,
  active: FeatureFilter,
): GlossaryFeature[] {
  if (active === 'all') {
    return entry.features.length > 1 ? entry.features : [];
  }
  return entry.features.filter((f) => f !== active);
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchAt = lower.indexOf(needle, cursor);
  let key = 0;
  while (matchAt !== -1) {
    if (matchAt > cursor) parts.push(text.slice(cursor, matchAt));
    parts.push(
      <mark key={`h-${key++}`} className="umkm-glossary-mark">
        {text.slice(matchAt, matchAt + needle.length)}
      </mark>,
    );
    cursor = matchAt + needle.length;
    matchAt = lower.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function GlossaryTerm({
  entry,
  open,
  onToggle,
  activeFeature,
  query,
}: {
  entry: GlossaryEntry;
  open: boolean;
  onToggle: () => void;
  activeFeature: FeatureFilter;
  query: string;
}) {
  const alsoOn = alsoOnLabels(entry, activeFeature);

  return (
    <article className={`umkm-glossary-card${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="umkm-glossary-card-trigger"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="umkm-glossary-card-head">
          <span className="umkm-glossary-card-title">
            <Highlight text={entry.label} query={query} />
          </span>
          {entry.formula ? (
            <span className="umkm-glossary-formula-cue">Formula</span>
          ) : null}
        </span>
        <span className="umkm-glossary-card-preview">
          {open ? entry.description : previewText(entry.description)}
        </span>
        <span className="umkm-glossary-card-chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div className="umkm-glossary-card-body">
          {entry.formula ? (
            <div className="umkm-glossary-formula">
              <span>How it is calculated</span>
              <p>
                <Highlight text={entry.formula} query={query} />
              </p>
            </div>
          ) : null}
          {alsoOn.length > 0 ? (
            <p className="umkm-glossary-also">
              <span>Also on</span>
              {alsoOn.map((f) => GLOSSARY_FEATURE_LABELS[f]).join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function FeatureChipRail({
  feature,
  onSelect,
  counts,
}: {
  feature: FeatureFilter;
  onSelect: (next: FeatureFilter) => void;
  counts: Record<FeatureFilter, number>;
}) {
  return (
    <div
      className="umkm-glossary-chips"
      role="toolbar"
      aria-label="Filter by feature"
    >
      <button
        type="button"
        className={feature === 'all' ? 'is-active' : undefined}
        onClick={() => onSelect('all')}
      >
        All <em>{counts.all}</em>
      </button>
      {GLOSSARY_FEATURES.map((key) => (
        <button
          key={key}
          type="button"
          className={feature === key ? 'is-active' : undefined}
          onClick={() => onSelect(key)}
          disabled={counts[key] === 0 && feature !== key}
        >
          {GLOSSARY_FEATURE_LABELS[key]} <em>{counts[key]}</em>
        </button>
      ))}
    </div>
  );
}

function TermList({
  entries,
  openId,
  onToggle,
  activeFeature,
  query,
  idPrefix = '',
}: {
  entries: GlossaryEntry[];
  openId: string | null;
  onToggle: (id: string) => void;
  activeFeature: FeatureFilter;
  query: string;
  idPrefix?: string;
}) {
  return (
    <div className="umkm-glossary-cards">
      {entries.map((entry) => {
        const key = idPrefix ? `${idPrefix}${entry.id}` : entry.id;
        return (
          <GlossaryTerm
            key={key}
            entry={entry}
            open={openId === key}
            onToggle={() => onToggle(key)}
            activeFeature={activeFeature}
            query={query}
          />
        );
      })}
    </div>
  );
}

export default function GlossaryPage() {
  const tr = useTr();
  const [search, setSearch] = useState('');
  const [feature, setFeature] = useState<FeatureFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const searchRef = useRef<HTMLInputElement>(null);

  const queryActive = deferredSearch.trim().length > 0;

  const entries = useMemo(
    () => sortByLabel(searchGlossary(deferredSearch, feature)),
    [deferredSearch, feature],
  );
  const groups = useMemo(() => {
    if (queryActive || feature !== 'all') return [];
    return groupGlossaryByFeature(entries).map((group) => ({
      ...group,
      entries: sortByLabel(group.entries),
    }));
  }, [entries, queryActive, feature]);

  const counts = useMemo(() => {
    const allMatches = searchGlossary(deferredSearch, 'all');
    const next = { all: allMatches.length } as Record<FeatureFilter, number>;
    for (const key of GLOSSARY_FEATURES) {
      next[key] = allMatches.filter((e) => e.features.includes(key)).length;
    }
    return next;
  }, [deferredSearch]);

  useEffect(() => {
    setOpenId(null);
  }, [deferredSearch, feature]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        e.key === '/' &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA' &&
        !(e.target as HTMLElement | null)?.isContentEditable
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        if (search) setSearch('');
        else searchRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [search]);

  function selectFeature(next: FeatureFilter) {
    startTransition(() => setFeature(next));
  }

  function toggleTerm(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  function clearFilters() {
    startTransition(() => {
      setSearch('');
      setFeature('all');
    });
    searchRef.current?.focus();
  }

  const countLabel =
    entries.length === 1 ? tr('1 term') : tr(`${entries.length} terms`);

  const showGrouped = !queryActive && feature === 'all';

  return (
    <section className="umkm-glossary-page">
      <PageHeader title="Dictionary" description={GLOSSARY_PAGE_INTRO} />

      <div className="umkm-glossary-toolbar">
        <div className="umkm-glossary-toolbar-top">
          <label className="umkm-glossary-search">
            <span className="umkm-field-label">{tr('Search terms')}</span>
            <span className="umkm-glossary-search-field">
              <span className="umkm-glossary-search-icon" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Try margin, LTV, paid, stock…"
                autoComplete="off"
                enterKeyHint="search"
              />
              {search ? (
                <button
                  type="button"
                  className="umkm-glossary-search-clear"
                  onClick={() => {
                    setSearch('');
                    searchRef.current?.focus();
                  }}
                  aria-label={tr('Clear search')}
                >
                  {tr('Clear')}
                </button>
              ) : (
                <kbd className="umkm-glossary-kbd" title="Press / to search">
                  /
                </kbd>
              )}
            </span>
          </label>
          <p className="umkm-glossary-count" aria-live="polite">
            <strong>{countLabel}</strong>
            <span>
              {feature === 'all'
                ? queryActive
                  ? tr(' matching')
                  : tr(' across all features')
                : ` ${tr('in')} ${tr(GLOSSARY_FEATURE_LABELS[feature])}`}
            </span>
          </p>
        </div>

        <FeatureChipRail
          feature={feature}
          onSelect={selectFeature}
          counts={counts}
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Try another word or clear the feature filter. Search looks at names, meanings, formulas, and feature tags."
        >
          <button
            type="button"
            className="umkm-btn secondary"
            onClick={clearFilters}
          >
            Clear search & filters
          </button>
        </EmptyState>
      ) : showGrouped ? (
        <div className="umkm-glossary-sections">
          {groups.map((group) => (
            <section
              key={group.feature}
              id={`glossary-${group.feature}`}
              className="umkm-glossary-section"
              aria-labelledby={`glossary-title-${group.feature}`}
            >
              <header className="umkm-glossary-section-head">
                <div className="umkm-glossary-section-head-row">
                  <h2 id={`glossary-title-${group.feature}`}>
                    {tr(GLOSSARY_FEATURE_LABELS[group.feature])}
                  </h2>
                  <div className="umkm-glossary-section-actions">
                    <span className="umkm-glossary-section-count">
                      {group.entries.length} {tr('terms')}
                    </span>
                    <button
                      type="button"
                      className="umkm-glossary-focus"
                      onClick={() => selectFeature(group.feature)}
                    >
                      {tr('Only this')}
                    </button>
                  </div>
                </div>
                <p>{group.intro}</p>
              </header>
              <TermList
                entries={group.entries}
                openId={openId}
                onToggle={toggleTerm}
                activeFeature={group.feature}
                query={deferredSearch}
                idPrefix={`${group.feature}:`}
              />
            </section>
          ))}
        </div>
      ) : (
        <section
          className="umkm-glossary-section"
          aria-labelledby="glossary-section-title"
        >
          <header className="umkm-glossary-section-head">
            <h2 id="glossary-section-title">
              {queryActive
                ? tr('Search results')
                : tr(GLOSSARY_FEATURE_LABELS[feature as GlossaryFeature])}
            </h2>
            {!queryActive && feature !== 'all' ? (
              <p>{tr(GLOSSARY_SECTION_INTROS[feature])}</p>
            ) : (
              <p>{tr('Open a card for the full meaning and formula.')}</p>
            )}
          </header>
          <TermList
            entries={entries}
            openId={openId}
            onToggle={toggleTerm}
            activeFeature={feature}
            query={deferredSearch}
          />
        </section>
      )}
    </section>
  );
}
