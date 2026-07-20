import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

export function formatDate(date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', options ?? { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}


export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return 'Never';
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

export interface ExportFilenameOptions {
  baseName: string;
  userNameOrCandidate?: string | null;
  search?: string | null;
  status?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}

export function generateExportFilename(options: ExportFilenameOptions): string {
  const { baseName, userNameOrCandidate, search, status, fromDate, toDate } = options;
  const parts: string[] = [baseName];

  const sanitize = (str: string) =>
    str
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

  if (userNameOrCandidate) {
    const cleaned = sanitize(userNameOrCandidate);
    if (cleaned) parts.push(cleaned);
  }

  if (search) {
    const cleaned = sanitize(search);
    if (cleaned) parts.push(cleaned);
  }

  if (status) {
    const cleaned = sanitize(status);
    if (cleaned) parts.push(cleaned);
  }

  const cleanFrom = fromDate ? fromDate.replace(/-/g, '') : null;
  const cleanTo = toDate ? toDate.replace(/-/g, '') : null;

  if (cleanFrom && cleanTo) {
    parts.push(`FROM_${cleanFrom}_TO_${cleanTo}`);
  } else if (cleanFrom) {
    parts.push(`FROM_${cleanFrom}`);
  } else if (cleanTo) {
    parts.push(`TO_${cleanTo}`);
  }

  if (parts.length === 1) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${baseName}_${year}${month}${day}.xlsx`;
  }

  return `${parts.join('_')}.xlsx`;
}

