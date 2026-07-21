import { isAxiosError } from 'axios';

function extractRawMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) {
    const first = message[0];
    return typeof first === 'string' ? first : undefined;
  }
  if (typeof message === 'string') return message;
  return undefined;
}

const TECHNICAL_HINT =
  /(\.env|sk_test_|sk_live_|xnd_|whsec_|STRIPE_|XENDIT_|API [Kk]ey|ECONNREFUSED|Prisma|BullMQ|stack|SyntaxError|TypeError|dashboard\.stripe|invoice failed \(\d+\)|\{|\[object)/i;

/** Messages safe to show in UI toasts (not dev/ops details). */
function isUserFriendly(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 180) return false;
  if (TECHNICAL_HINT.test(trimmed)) return false;
  return true;
}

function statusFallback(status: number | undefined, fallback: string): string {
  switch (status) {
    case 400:
      return 'Something was wrong with your request. Please check and try again.';
    case 401:
      return 'Please sign in again.';
    case 403:
      return 'You do not have permission to do this.';
    case 404:
      return 'We could not find what you were looking for.';
    case 409:
      return 'This action could not be completed because of a conflict.';
    case 422:
      return 'Please check your input and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    default:
      if (status && status >= 500) return fallback;
      return fallback;
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;

  const status = error.response?.status;
  const raw = extractRawMessage(error.response?.data);

  if (raw && isUserFriendly(raw)) return raw;

  return statusFallback(status, fallback);
}
