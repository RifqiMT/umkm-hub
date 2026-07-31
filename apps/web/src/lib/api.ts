import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setSession,
} from './auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  searchParams?: Record<
    string,
    string | number | string[] | undefined | null
  >;
};

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      profile: { id: string; profileName: string };
    };
    setSession(data);
    return true;
  } catch (err) {
    console.error('Token refresh failed', err);
    return false;
  }
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true, searchParams } = options;
  const url = new URL(`${API_URL}${path}`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        if (value.length === 0) return;
        url.searchParams.set(key, value.join(','));
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      res = await fetch(url.toString(), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } else {
      clearSession();
    }
  }

  if (!res.ok) {
    let message = 'Something went wrong—please try again.';
    try {
      const errBody = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(errBody.message)) message = errBody.message.join(', ');
      else if (errBody.message) message = errBody.message;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      /* fall through */
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(header);
  if (plainMatch?.[1]) return plainMatch[1];
  return fallback;
}

/** Authenticated binary download (JSON/CSV export, etc.). */
async function downloadAuthenticatedFile(
  path: string,
  searchParams?: Record<string, string | number | undefined | null>,
): Promise<{ blob: Blob; filename: string }> {
  const url = new URL(`${API_URL}${path}`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(url.toString(), { method: 'GET', headers });

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const next = getAccessToken();
      if (next) headers.Authorization = `Bearer ${next}`;
      res = await fetch(url.toString(), { method: 'GET', headers });
    } else {
      clearSession();
    }
  }

  if (!res.ok) {
    let message = 'Something went wrong—please try again.';
    try {
      const errBody = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(errBody.message)) message = errBody.message.join(', ');
      else if (errBody.message) message = errBody.message;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, message);
  }

  const blob = await res.blob();
  const fallback =
    searchParams?.format === 'csv'
      ? 'umkm-hub-export.zip'
      : searchParams?.format === 'csv-unified'
        ? 'umkm-hub-export-unified.csv'
        : 'umkm-hub-export.json';
  const filename = filenameFromDisposition(
    res.headers.get('Content-Disposition'),
    fallback,
  );
  return { blob, filename };
}

export async function downloadDataExport(
  format: 'json' | 'csv' | 'csv-unified',
): Promise<{ blob: Blob; filename: string }> {
  return downloadAuthenticatedFile('/export', { format });
}

export type FeatureExportEntity =
  | 'products'
  | 'customers'
  | 'orders'
  | 'warehouse'
  | 'targets';

/** Feature-scoped export (own profile, single entity only). */
export async function downloadFeatureExport(
  entity: FeatureExportEntity,
  format: 'json' | 'csv' | 'csv-unified',
): Promise<{ blob: Blob; filename: string }> {
  return downloadAuthenticatedFile('/export', { format, entity });
}

/** Printable PDF invoice for an order (bill/tagihan or faktur pajak layout). */
export async function downloadOrderInvoicePdf(
  orderId: string,
): Promise<{ blob: Blob; filename: string }> {
  return downloadAuthenticatedFile(`/orders/${orderId}/invoice/pdf`);
}

/** e-Faktur prep export for PKP businesses (CSV or XML). */
export async function downloadOrderFiscalExport(
  orderId: string,
  format: 'csv' | 'xml' = 'csv',
): Promise<{ blob: Blob; filename: string }> {
  return downloadAuthenticatedFile(`/orders/${orderId}/invoice/fiscal`, {
    format,
  });
}

export function saveDownloadedBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type DataImportResult = {
  scope: 'all-profiles' | 'own-profile';
  merged: Record<string, {
    created: number;
    updated: number;
    skipped: number;
  }>;
  notes: string[];
};

/** Merge-import business data from a unified JSON or unified CSV export file. */
export async function uploadDataImport(
  format: 'json' | 'csv-unified',
  file: File,
): Promise<DataImportResult> {
  const url = new URL(`${API_URL}/import`);
  url.searchParams.set('format', format);

  const form = new FormData();
  form.append('file', file);

  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(url.toString(), { method: 'POST', headers, body: form });

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const next = getAccessToken();
      if (next) headers.Authorization = `Bearer ${next}`;
      res = await fetch(url.toString(), { method: 'POST', headers, body: form });
    } else {
      clearSession();
    }
  }

  if (!res.ok) {
    let message = 'Import failed—please try again.';
    try {
      const errBody = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(errBody.message)) message = errBody.message.join(', ');
      else if (errBody.message) message = errBody.message;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as DataImportResult;
}

/** Merge-import feature-scoped data (products, customers, orders, or warehouse). */
export async function uploadFeatureImport(
  entity: FeatureExportEntity,
  format: 'json' | 'csv-unified',
  file: File,
): Promise<DataImportResult> {
  const url = new URL(`${API_URL}/import`);
  url.searchParams.set('format', format);
  url.searchParams.set('entity', entity);

  const form = new FormData();
  form.append('file', file);

  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(url.toString(), { method: 'POST', headers, body: form });

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const next = getAccessToken();
      if (next) headers.Authorization = `Bearer ${next}`;
      res = await fetch(url.toString(), { method: 'POST', headers, body: form });
    } else {
      clearSession();
    }
  }

  if (!res.ok) {
    let message = 'Import failed—please try again.';
    try {
      const errBody = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(errBody.message)) message = errBody.message.join(', ');
      else if (errBody.message) message = errBody.message;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as DataImportResult;
}

export async function translateBatch(
  texts: string[],
  to: string,
): Promise<string[]> {
  const data = await api<{ translations: string[] }>('/translate/batch', {
    method: 'POST',
    body: { to, texts },
  });
  return data.translations;
}

export async function translateBatchPublic(
  texts: string[],
  to: string,
): Promise<string[]> {
  const data = await api<{ translations: string[] }>('/translate/batch-public', {
    method: 'POST',
    body: { to, texts },
    auth: false,
  });
  return data.translations;
}

