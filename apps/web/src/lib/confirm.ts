export type ConfirmTone = 'danger' | 'warn' | 'neutral';

export type ConfirmOptions = {
  title: string;
  message: string;
  detail?: string;
  tone?: ConfirmTone;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmHandler = (options: ConfirmOptions) => Promise<boolean>;

let handler: ConfirmHandler | null = null;

/** Wired by ConfirmProvider — falls back to window.confirm if missing. */
export function registerConfirmHandler(next: ConfirmHandler | null) {
  handler = next;
}

async function ask(options: ConfirmOptions): Promise<boolean> {
  const tone = options.tone ?? 'danger';
  if (handler) {
    return handler({ ...options, tone });
  }
  const lines = [options.title, options.message];
  if (options.detail) lines.push(options.detail);
  return window.confirm(lines.join('\n\n'));
}

/** Confirm irreversible delete. */
export async function confirmDelete(
  entity: string,
  name?: string | null,
  detail = 'This cannot be undone.',
): Promise<boolean> {
  const label = name?.trim() ? `"${name.trim()}"` : `this ${entity}`;
  return ask({
    title: `Delete ${entity}?`,
    message: `You’re about to permanently remove ${label}.`,
    detail,
    tone: 'danger',
    confirmLabel: 'Delete',
  });
}

/** Confirm clear/reset of saved data. */
export async function confirmClear(
  message: string,
  detail?: string,
): Promise<boolean> {
  return ask({
    title: 'Clear saved data?',
    message,
    detail,
    tone: 'warn',
    confirmLabel: 'Clear',
  });
}
