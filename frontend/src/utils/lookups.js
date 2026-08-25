export function executorLabel(executor) {
  if (!executor) return '';
  const full = `${executor.first_name || ''} ${executor.last_name || ''}`.trim();
  return full || executor.name || '';
}
