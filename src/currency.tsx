export function currencySymbol(currencyCode: string): string {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    const symbolPart = parts.find((p) => p.type === 'currency');
    return symbolPart?.value ?? currencyCode;
  } catch {
    // Unknown/invalid currency code — fall back to showing the code itself.
    return currencyCode;
  }
}
