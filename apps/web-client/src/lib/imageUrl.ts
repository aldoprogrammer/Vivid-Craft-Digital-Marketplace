const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Resolve product preview URLs served via the API gateway + Flask image processor. */
export function resolveImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api/')) return `${API_BASE}${url}`;
  const filename = url.split('/').pop();
  if (filename?.includes('.')) {
    return `${API_BASE}/api/images/files/${filename}`;
  }
  return undefined;
}
