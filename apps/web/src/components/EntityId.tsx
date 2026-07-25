'use client';

import { useState } from 'react';
import { shortEntityId } from '@/lib/entity-id';

/** Compact ID badge for catalog lists and cards. */
export function EntityIdBadge({
  id,
  literal = false,
  compact = false,
  quiet = false,
  soft = false,
}: {
  id: string;
  /** When true, show the id as-is (e.g. product SKU). */
  literal?: boolean;
  /** When true with literal, shorten a long `{PREFIX}_{uuid}` SKU. */
  compact?: boolean;
  /** Text-style ID (no pill) for dense table cells. */
  quiet?: boolean;
  /** Soft pill — professional SKU label without heavy chrome. */
  soft?: boolean;
}) {
  const display = literal
    ? compact
      ? compactLiteralId(id)
      : id
    : shortEntityId(id);
  const tone = soft ? ' is-soft' : quiet ? ' is-quiet' : ' umkm-badge sm';
  return (
    <span className={`umkm-entity-id${tone}`} title={id}>
      {literal ? display : `ID ${display}`}
    </span>
  );
}

function compactLiteralId(sku: string): string {
  const orderMatch = sku.match(
    /^(\d{4}_\d{2}_\d{2}_)([0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12})$/i,
  );
  if (orderMatch) {
    const hex = orderMatch[2].replace(/-/g, '');
    return `${orderMatch[1]}${hex.slice(0, 8)}…`;
  }
  const uuidMatch = sku.match(
    /^(.+_)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  if (uuidMatch) {
    return `${uuidMatch[1]}${uuidMatch[2].replace(/-/g, '').slice(0, 8)}…`;
  }
  // Product SKUs like CB_100_{hex…} without full UUID dashes
  const hexTail = sku.match(/^([A-Za-z0-9]+(?:_[A-Za-z0-9]+){1,3}_)([0-9a-f]{12,})$/i);
  if (hexTail) {
    return `${hexTail[1]}${hexTail[2].slice(0, 8)}…`;
  }
  if (sku.length > 22) return `${sku.slice(0, 18)}…`;
  return sku;
}

/** Full ID row for View sheets — monospace + copy. */
export function EntityIdDetail({
  id,
  label = 'ID',
}: {
  id: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.error('Failed to copy entity id', err);
    }
  }

  return (
    <div className="umkm-entity-id-detail">
      <span className="umkm-entity-id-detail-label">{label}</span>
      <div className="umkm-entity-id-row">
        <code className="umkm-entity-id-full">{id}</code>
        <button
          type="button"
          className="umkm-btn secondary sm"
          onClick={() => void copy()}
          aria-label={`Copy ${label}`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
