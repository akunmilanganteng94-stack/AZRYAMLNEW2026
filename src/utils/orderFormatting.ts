export interface BulkAccountItem {
  email: string;
  inbox_link: string;
  validUntil: string;
}

export function extractBulkAccounts(apiResponse: any): BulkAccountItem[] {
  if (!apiResponse) return [];
  const items: BulkAccountItem[] = [];
  const seen = new Set<string>();

  const walk = (node: any, depth = 0) => {
    if (!node || depth > 6) return;

    if (Array.isArray(node)) {
      node.forEach((child) => walk(child, depth + 1));
      return;
    }

    if (typeof node !== 'object') return;

    const email = node.email || node.gmail || '';
    const inbox_link =
      node.inbox_link || node.inboxLink || node.inbox || '';
    const validUntil =
      node.validUntil || node.valid_until || node.expiredAt || node.expiresAt || '';

    if (email || inbox_link || validUntil) {
      const normalized = {
        email: String(email || ''),
        inbox_link: String(inbox_link || ''),
        validUntil: String(validUntil || '')
      };
      const key = `${normalized.email}|${normalized.inbox_link}|${normalized.validUntil}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(normalized);
      }
      return;
    }

    Object.values(node).forEach((val) => {
      if (val && typeof val === 'object') {
        walk(val, depth + 1);
      }
    });
  };

  walk(apiResponse, 0);
  return items;
}

export function extractVerifMessage(order: {
  apiResponse?: any;
  errorNote?: string;
  status: string;
}): string {
  const msg =
    order.apiResponse?.message ||
    order.apiResponse?.msg ||
    order.apiResponse?.data?.message ||
    order.apiResponse?.error;

  if (typeof msg === 'string' && msg.trim()) {
    return msg.trim();
  }
  if (order.errorNote && order.errorNote.trim()) {
    return order.errorNote.trim();
  }
  return order.status === 'Berhasil'
    ? 'Verifikasi akun AM berhasil terkonfirmasi!'
    : 'Verifikasi gagal diproses.';
}

export function formatValidUntil(value: string): string {
  if (!value) return '-';
  const parsed = Date.parse(value);
  if (!isNaN(parsed) && /[-T:]/.test(value)) {
    return new Date(parsed).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }
  return value;
}
