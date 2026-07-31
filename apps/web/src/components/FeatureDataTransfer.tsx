'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import {
  ApiError,
  downloadFeatureExport,
  uploadFeatureImport,
  type FeatureExportEntity,
} from '@/lib/api';
import { useTr } from '@/components/Tr';

type FileFormat = 'json' | 'csv-unified';

type Props = {
  entity: FeatureExportEntity;
  label: string;
  onImported?: () => void | Promise<void>;
};

function SyncIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 12a8 8 0 0 1 13.5-5.7M20 12a8 8 0 0 1-13.5 5.7"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <path
        d="M16 4h4V0M8 20H4v4"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActionIcon({ kind }: { kind: 'export' | 'import' | 'check' | 'alert' }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    'aria-hidden': true,
  };
  if (kind === 'export') {
    return (
      <svg {...common}>
        <path
          d="M12 4v9m0 0 3-3m-3 3 3 3M5 19h14"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'import') {
    return (
      <svg {...common}>
        <path
          d="M12 20V11m0 0 3 3m-3-3-3 3M5 5h14"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'check') {
    return (
      <svg {...common}>
        <path
          d="m5 12 4.2 4.2L19 7"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path
        d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  );
}

type ToggleProps = {
  open: boolean;
  onClick: () => void;
  controlsId: string;
  disabled?: boolean;
};

export function FeatureDataTransferToggle({
  open,
  onClick,
  controlsId,
  disabled = false,
}: ToggleProps) {
  const tr = useTr();
  return (
    <button
      type="button"
      className={`umkm-feature-sync-toggle${open ? ' is-open' : ''}`}
      aria-expanded={open}
      aria-controls={controlsId}
      aria-label={
        open ? tr('Hide backup and sync') : tr('Show backup and sync')
      }
      disabled={disabled}
      onClick={onClick}
    >
      <SyncIcon />
      <span className="umkm-feature-sync-toggle-label">
        {tr('Backup & sync')}
      </span>
    </button>
  );
}

export function FeatureDataTransfer({
  entity,
  label,
  onImported,
}: Props) {
  const tr = useTr();
  const panelId = `feature-sync-${entity}`;
  const [format, setFormat] = useState<FileFormat>('json');
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const working = busy !== null;
  const accept =
    format === 'json' ? '.json,application/json' : '.csv,text/csv';
  const formatLabel = format === 'json' ? 'JSON' : 'CSV';
  const feedback = error || message;
  const feedbackOk = Boolean(message && !error);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function onExport() {
    setError('');
    setMessage('');
    setBusy('export');
    try {
      const { blob, filename } = await downloadFeatureExport(entity, format);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage(`${label} ${formatLabel} downloaded.`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : tr('Export failed—please try again.'),
      );
    } finally {
      setBusy(null);
    }
  }

  const onImportFile = useCallback(
    async (file: File | undefined) => {
      if (!file || working) return;
      setError('');
      setMessage('');
      setBusy('import');
      try {
        const result = await uploadFeatureImport(entity, format, file);
        const totals = Object.values(result.merged).reduce(
          (acc, row) => ({
            created: acc.created + row.created,
            updated: acc.updated + row.updated,
            skipped: acc.skipped + row.skipped,
          }),
          { created: 0, updated: 0, skipped: 0 },
        );
        setMessage(
          `Merged ${totals.created + totals.updated} rows (${totals.created} new, ${totals.updated} updated).`,
        );
        await onImported?.();
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : tr('Import failed—please try again.'),
        );
      } finally {
        setBusy(null);
        if (importRef.current) importRef.current.value = '';
      }
    },
    [entity, format, onImported, tr, working],
  );

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    dragDepth.current += 1;
    setDragOver(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragOver(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    void onImportFile(e.dataTransfer.files?.[0]);
  }

  return (
    <section
      id={panelId}
      className={[
        'umkm-feature-sync',
        dragOver ? 'is-dragover' : '',
        working ? 'is-busy' : '',
        feedback ? (feedbackOk ? 'is-ok' : 'is-error') : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${label} backup and sync`}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="umkm-feature-sync-panel">
        {dragOver ? (
          <div className="umkm-feature-sync-overlay" aria-live="polite">
            <ActionIcon kind="import" />
            Release to merge {label.toLowerCase()} ({formatLabel})
          </div>
        ) : null}

        <div className="umkm-feature-sync-main">
          <div className="umkm-feature-sync-intro">
            <p className="umkm-feature-sync-kicker">{tr('DATA')}</p>
            <div className="umkm-feature-sync-title-row">
              <h2 className="umkm-feature-sync-title">{tr('Backup & sync')}</h2>
              <span className="umkm-feature-sync-scope">{label}</span>
            </div>
            <p className="umkm-feature-sync-note">
              Export or import {label.toLowerCase()} as {formatLabel}. Records
              merge by ID.
              <span className="umkm-feature-sync-note-drag">
                {' '}
                Drop a file on this panel or tap Import.
              </span>
            </p>
          </div>

          <div className="umkm-feature-sync-toolbar">
            <div
              className="umkm-feature-sync-segment"
              role="radiogroup"
              aria-label={tr('File format')}
            >
              {(
                [
                  ['json', 'JSON'],
                  ['csv-unified', 'CSV'],
                ] as const
              ).map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  className={`umkm-feature-sync-segment-btn${format === value ? ' is-active' : ''}`}
                  aria-checked={format === value}
                  disabled={working}
                  onClick={() => setFormat(value)}
                >
                  {text}
                </button>
              ))}
            </div>

            <div className="umkm-feature-sync-actions">
              <button
                type="button"
                className="umkm-feature-sync-btn is-export"
                disabled={working}
                onClick={() => void onExport()}
              >
                <ActionIcon kind="export" />
                <span>
                  {busy === 'export' ? tr('Exporting…') : tr('Export')}
                </span>
              </button>
              <button
                type="button"
                className="umkm-feature-sync-btn is-import"
                disabled={working}
                onClick={() => importRef.current?.click()}
              >
                <ActionIcon kind="import" />
                <span>
                  {busy === 'import' ? tr('Importing…') : tr('Import')}
                </span>
              </button>
              <input
                ref={importRef}
                type="file"
                accept={accept}
                className="umkm-sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => void onImportFile(e.target.files?.[0])}
              />
            </div>
          </div>
        </div>

        {feedback ? (
          <p
            className={`umkm-feature-sync-status${feedbackOk ? ' is-ok' : ' is-error'}`}
            role={feedbackOk ? 'status' : 'alert'}
          >
            <ActionIcon kind={feedbackOk ? 'check' : 'alert'} />
            {feedback}
          </p>
        ) : null}
      </div>
    </section>
  );
}
