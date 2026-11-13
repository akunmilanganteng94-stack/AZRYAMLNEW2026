export interface BulkAccountItem {
  email: string;
  inbox_link: string;
  validUntil: string;
}

export function extractBulkAccounts(apiResponse: any): BulkAccountItem[] {
  if (!apiResponse) return [];
  const items: BulkAccountItem[] = [];

  const pushCandidate = (raw: any) => {
    if (!raw || typeof raw !== 'object') return;
    const src =
      raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
        ? raw.data
        : raw;

    const email = src.email || src.gmail || raw.email || raw.gmail || '';
    const inbox_link =
      src.inbox_link || src.inboxLink || raw.inbox_link || raw.inboxLink || '';
    const validUntil =
      src.validUntil || src.valid_until || raw.validUntil || raw.valid_until || '';

    if (email || inbox_link || validUntil) {
      items.push({
        email: String(email || ''),
        inbox_link: String(inbox_link || ''),
        validUntil: String(validUntil || '')
      });
    }
  };

  if (Array.isArray(apiResponse)) {
    apiResponse.forEach(pushCandidate);
  } else if (Array.isArray(apiResponse.accounts)) {
    apiResponse.accounts.forEach(pushCandidate);
  } else if (Array.isArray(apiResponse.data)) {
    apiResponse.data.forEach(pushCandidate);
  } else if (Array.isArray(apiResponse.results)) {
    apiResponse.results.forEach(pushCandidate);
  } else if (Array.isArray(apiResponse.items)) {
    apiResponse.items.forEach(pushCandidate);
  } else if (apiResponse.data && typeof apiResponse.data === 'object') {
    if (Array.isArray(apiResponse.data.accounts)) {
      apiResponse.data.accounts.forEach(pushCandidate);
    } else {
      pushCandidate(apiResponse.data);
    }
  } else {
    pushCandidate(apiResponse);
  }

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
