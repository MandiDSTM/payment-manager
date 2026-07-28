export function formatAmount(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return value ?? '—';
  return new Intl.NumberFormat('fa-IR').format(num);
}

export function statusBadgeClass(status) {
  const s = String(status || '');
  if (s.includes('تکمیل')) return 'ui-badge ui-badge-success';
  if (s.includes('انتظار') || s.includes('پرداخت')) return 'ui-badge ui-badge-warning';
  if (s.includes('ثبت نشده') || s.includes('خام')) return 'ui-badge ui-badge-neutral';
  if (s.includes('مسدود') || s.includes('خطا')) return 'ui-badge ui-badge-danger';
  return 'ui-badge ui-badge-primary';
}
