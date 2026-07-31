'use client';

import { useRef } from 'react';
import { ContentSection } from '@/components/PageHeader';

function DataTransferIcon({
  kind,
}: {
  kind: 'json' | 'csv' | 'download' | 'upload' | 'shield' | 'merge';
}) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    'aria-hidden': true,
  };
  switch (kind) {
    case 'json':
      return (
        <svg {...common}>
          <path
            d="M8 4h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M14 4v4h4M8 12h8M8 16h5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'csv':
      return (
        <svg {...common}>
          <path
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4H14l6 6v9.5A2.5 2.5 0 0 1 17.5 22h-11A2.5 2.5 0 0 1 4 19.5v-13Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M14 4v6h6M8 13h8M8 17h8M8 9h3"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'download':
      return (
        <svg {...common}>
          <path
            d="M12 3v10m0 0 4-4m-4 4-4-4M5 19h14"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'upload':
      return (
        <svg {...common}>
          <path
            d="M12 21V11m0 0 4 4m-4-4-4 4M5 5h14"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path
            d="M12 3 4 6.5V11c0 4.2 3.2 7.9 8 9 4.8-1.1 8-4.8 8-9V6.5L12 3Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'merge':
      return (
        <svg {...common}>
          <path
            d="M7 7h10M7 12h6M7 17h8M4 4v16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="18" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      );
  }
}

type ProfileDataSectionProps = {
  exportScope: 'all-profiles' | 'own-profile';
  booting: boolean;
  hasProfile: boolean;
  exporting: 'json' | 'csv' | 'csv-unified' | null;
  importing: 'json' | 'csv-unified' | null;
  onExport: (format: 'json' | 'csv' | 'csv-unified') => void;
  onImport: (format: 'json' | 'csv-unified', file: File | undefined) => void;
};

export function ProfileDataSection({
  exportScope,
  booting,
  hasProfile,
  exporting,
  importing,
  onExport,
  onImport,
}: ProfileDataSectionProps) {
  const jsonImportRef = useRef<HTMLInputElement>(null);
  const csvImportRef = useRef<HTMLInputElement>(null);
  const busy = booting || !hasProfile || exporting !== null || importing !== null;

  return (
    <ContentSection
      className="umkm-profile-export"
      eyebrow="Data"
      title={
        exportScope === 'all-profiles'
          ? 'Export & import all data'
          : 'Export & import my data'
      }
      description={
        exportScope === 'all-profiles'
          ? 'Back up or restore every profile and related business record.'
          : 'Back up or restore this profile’s products, customers, orders, and targets.'
      }
    >
      <div className="umkm-data-transfer">
        <div className="umkm-data-transfer-head">
          <span
            className={`umkm-data-transfer-scope${exportScope === 'all-profiles' ? ' is-wide' : ''}`}
          >
            {exportScope === 'all-profiles' ? 'All profiles' : 'Your profile only'}
          </span>
          <p className="umkm-data-transfer-lead">
            {exportScope === 'all-profiles'
              ? 'Operator scope — full sandbox backup and merge-restore.'
              : 'Personal scope — safe for backup and sync.'}
          </p>
        </div>

        <div className="umkm-data-transfer-grid">
          <section
            className="umkm-data-transfer-panel is-export"
            aria-labelledby="data-export-heading"
          >
            <header className="umkm-data-transfer-panel-head">
              <span className="umkm-data-transfer-panel-icon" aria-hidden>
                <DataTransferIcon kind="download" />
              </span>
              <div>
                <h3 id="data-export-heading">Export</h3>
                <p>Download a snapshot you can archive or re-import later.</p>
              </div>
            </header>

            <ul className="umkm-data-transfer-formats">
              <li className="umkm-data-transfer-format">
                <div className="umkm-data-transfer-format-icon">
                  <DataTransferIcon kind="json" />
                </div>
                <div className="umkm-data-transfer-format-copy">
                  <strong>JSON</strong>
                  <span>Full structured dump — best for complete round-trip backup.</span>
                </div>
                <button
                  className="umkm-btn secondary umkm-data-transfer-btn"
                  type="button"
                  disabled={busy}
                  onClick={() => onExport('json')}
                >
                  {exporting === 'json' ? 'Preparing…' : 'Download'}
                </button>
              </li>
              <li className="umkm-data-transfer-format is-featured">
                <div className="umkm-data-transfer-format-icon">
                  <DataTransferIcon kind="csv" />
                </div>
                <div className="umkm-data-transfer-format-copy">
                  <strong>Unified CSV</strong>
                  <span>
                    One spreadsheet-friendly file with a <code>table</code> column per entity.
                  </span>
                </div>
                <button
                  className="umkm-btn umkm-data-transfer-btn"
                  type="button"
                  disabled={busy}
                  onClick={() => onExport('csv-unified')}
                >
                  {exporting === 'csv-unified' ? 'Preparing…' : 'Download'}
                </button>
              </li>
            </ul>

            <button
              className="umkm-data-transfer-alt"
              type="button"
              disabled={busy}
              onClick={() => onExport('csv')}
            >
              {exporting === 'csv'
                ? 'Preparing ZIP…'
                : 'Also available: CSV ZIP (one file per table)'}
            </button>
          </section>

          <section
            className="umkm-data-transfer-panel is-import"
            aria-labelledby="data-import-heading"
          >
            <header className="umkm-data-transfer-panel-head">
              <span className="umkm-data-transfer-panel-icon" aria-hidden>
                <DataTransferIcon kind="upload" />
              </span>
              <div>
                <h3 id="data-import-heading">Import</h3>
                <p>Merge a file — updates existing rows, never duplicates.</p>
              </div>
            </header>

            <input
              ref={jsonImportRef}
              type="file"
              accept=".json,application/json"
              className="umkm-sr-only"
              onChange={(e) => {
                onImport('json', e.target.files?.[0]);
                if (jsonImportRef.current) jsonImportRef.current.value = '';
              }}
            />
            <input
              ref={csvImportRef}
              type="file"
              accept=".csv,text/csv"
              className="umkm-sr-only"
              onChange={(e) => {
                onImport('csv-unified', e.target.files?.[0]);
                if (csvImportRef.current) csvImportRef.current.value = '';
              }}
            />

            <ul className="umkm-data-transfer-formats">
              <li className="umkm-data-transfer-format">
                <div className="umkm-data-transfer-format-icon">
                  <DataTransferIcon kind="json" />
                </div>
                <div className="umkm-data-transfer-format-copy">
                  <strong>JSON</strong>
                  <span>Restore from a unified JSON export file.</span>
                </div>
                <button
                  className="umkm-btn secondary umkm-data-transfer-btn"
                  type="button"
                  disabled={busy}
                  onClick={() => jsonImportRef.current?.click()}
                >
                  {importing === 'json' ? 'Merging…' : 'Choose file'}
                </button>
              </li>
              <li className="umkm-data-transfer-format is-featured">
                <div className="umkm-data-transfer-format-icon">
                  <DataTransferIcon kind="csv" />
                </div>
                <div className="umkm-data-transfer-format-copy">
                  <strong>Unified CSV</strong>
                  <span>Restore from a unified CSV export (same format as download).</span>
                </div>
                <button
                  className="umkm-btn umkm-data-transfer-btn"
                  type="button"
                  disabled={busy}
                  onClick={() => csvImportRef.current?.click()}
                >
                  {importing === 'csv-unified' ? 'Merging…' : 'Choose file'}
                </button>
              </li>
            </ul>
          </section>
        </div>

        <ul className="umkm-data-transfer-notes">
          <li>
            <DataTransferIcon kind="shield" />
            <span>
              {exportScope === 'all-profiles'
                ? 'Privileged export: profiles include a human-readable password column only — no passwordHash.'
                : 'Your password hash is sealed (pwd1:…) in export files; IP digests are never included.'}
            </span>
          </li>
          <li>
            <DataTransferIcon kind="merge" />
            <span>
              Import matches by id and natural keys; duplicate rows in the file are
              collapsed before merge.
            </span>
          </li>
        </ul>
      </div>
    </ContentSection>
  );
}
