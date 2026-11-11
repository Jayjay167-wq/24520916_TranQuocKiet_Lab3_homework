const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

/**
 * Format whole dong for display, e.g. 49000 -> "49.000 ₫".
 * Intl separates the number and the symbol with a non-breaking space, so a
 * price never wraps onto two lines.
 */
export function formatVnd(amount: number): string {
  return vndFormatter.format(amount);
}
