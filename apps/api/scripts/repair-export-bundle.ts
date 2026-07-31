import {
  openExportPasswordHash,
  isSealedExportPasswordHash,
} from '../src/export/export-password.util';
import {
  parseSandboxExportPasswords,
  resolveSandboxExportPassword,
} from '../src/export/export-sandbox-passwords.util';
import { csvEscape } from '../src/export/export-csv';
import { buildZipStore } from '../src/export/export-zip';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

function loadSecret(): string {
  return (
    process.env.PROFILE_LOCATION_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    'umkm-profile-location-dev-only'
  );
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]!);
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}

function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    const wide = headers.map((_, idx) => row[idx] ?? '');
    lines.push(wide.map(csvEscape).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function repairProfilesCsv(csvText: string, secret: string): {
  text: string;
  repairedSealed: number;
  plaintextAdded: number;
} {
  const sandboxPasswords = parseSandboxExportPasswords(
    process.env.SANDBOX_EXPORT_PASSWORDS,
  );
  const { headers, rows } = parseCsv(csvText);
  if (!headers.includes('passwordHash') && !headers.includes('password')) {
    throw new Error('profiles.csv has no password or passwordHash column');
  }

  let headerList = [...headers].filter((h) => h !== 'passwordHash');
  if (!headerList.includes('password')) {
    const sourceIdx = headerList.indexOf('locationSource');
    const insertAt = sourceIdx >= 0 ? sourceIdx + 1 : headerList.length;
    headerList.splice(insertAt, 0, 'password');
  }
  if (headerList.includes('passwordPlaintext')) {
    headerList = headerList.filter((h) => h !== 'passwordPlaintext');
  }

  let repairedSealed = 0;
  let plaintextAdded = 0;
  const nextRows = rows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = row[idx] ?? '';
    });

    const rawHash = record.passwordHash ?? '';
    if (isSealedExportPasswordHash(rawHash)) {
      const opened = openExportPasswordHash(rawHash, secret);
      if (opened) {
        record.passwordHash = opened;
        repairedSealed += 1;
      }
    }

    const plaintext = resolveSandboxExportPassword(
      record.profileName ?? '',
      sandboxPasswords,
    );
    if (plaintext) {
      record.password = plaintext;
      plaintextAdded += 1;
    } else {
      record.password = record.password ?? '';
    }

    return headerList.map((header) => record[header] ?? '');
  });

  return {
    text: rowsToCsv(headerList, nextRows),
    repairedSealed,
    plaintextAdded,
  };
}

function rebuildZip(dir: string): Buffer {
  const entries = readdirSync(dir)
    .filter((name) => name.endsWith('.csv') || name === '_readme.txt')
    .map((name) => ({
      name,
      data: readFileSync(join(dir, name)),
    }));
  return buildZipStore(entries);
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error(
      'Usage: npx tsx scripts/repair-export-bundle.ts <export-folder-or-profiles.csv>',
    );
    process.exit(1);
  }

  const secret = loadSecret();
  const stat = statSync(target);
  let profilesPath: string;
  let exportDir: string | null = null;

  if (stat.isDirectory()) {
    exportDir = target;
    profilesPath = join(target, 'profiles.csv');
  } else {
    profilesPath = target;
    exportDir = basename(profilesPath) === 'profiles.csv' ? join(target, '..') : null;
  }

  const original = readFileSync(profilesPath, 'utf8');
  const result = repairProfilesCsv(original, secret);
  writeFileSync(profilesPath, result.text, 'utf8');
  console.log(`Updated ${profilesPath}`);
  console.log(`  unsealed pwd1 hashes: ${result.repairedSealed}`);
  console.log(`  password rows: ${result.plaintextAdded}`);

  if (exportDir && statSync(exportDir).isDirectory()) {
    const readmePath = join(exportDir, '_readme.txt');
    try {
      const readme = readFileSync(readmePath, 'utf8');
      if (!readme.includes('passwordPlaintext')) {
        writeFileSync(
          readmePath,
          `${readme.trim()}\n- Repaired export: passwordHash uses plaintext bcrypt; passwordPlaintext added when sandbox password still matches.\n`,
          'utf8',
        );
      }
    } catch {
      /* optional */
    }

    const zipPath = `${exportDir}.zip`;
    writeFileSync(zipPath, rebuildZip(exportDir));
    console.log(`Rebuilt ${zipPath}`);
  }
}

main();
