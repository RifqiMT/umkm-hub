/** Escape a CSV cell (RFC 4180-ish). */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text: string;
  if (value instanceof Date) {
    text = value.toISOString();
  } else if (typeof value === 'object') {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(
  headers: string[],
  rows: Array<Record<string, unknown>>,
): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  // BOM helps Excel open UTF-8 correctly for human readers
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

type UnifiedCsvSheet = {
  name: string;
  rows: Array<Record<string, unknown>>;
  /** Fallback headers when the sheet has zero rows. */
  emptyHeaders?: string[];
};

/**
 * One CSV for all entities: leading `table` column + union of field columns.
 * Empty cells are left blank for fields that do not apply to that table.
 */
export function rowsToUnifiedCsv(sheets: UnifiedCsvSheet[]): string {
  const fields: string[] = [];
  const seen = new Set<string>();

  for (const sheet of sheets) {
    const keys =
      sheet.rows.length > 0
        ? Object.keys(sheet.rows[0]!)
        : (sheet.emptyHeaders ?? ['id']);
    for (const key of keys) {
      if (!seen.has(key)) {
        seen.add(key);
        fields.push(key);
      }
    }
    for (const row of sheet.rows) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) {
          seen.add(key);
          fields.push(key);
        }
      }
    }
  }

  const headers = ['table', ...fields];
  const lines = [headers.map(csvEscape).join(',')];

  for (const sheet of sheets) {
    if (sheet.rows.length === 0) {
      // Marker row so empty tables remain visible in the unified file
      const empty: Record<string, unknown> = { table: sheet.name };
      lines.push(headers.map((h) => csvEscape(empty[h])).join(','));
      continue;
    }
    for (const row of sheet.rows) {
      const wide: Record<string, unknown> = { table: sheet.name, ...row };
      lines.push(headers.map((h) => csvEscape(wide[h])).join(','));
    }
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
