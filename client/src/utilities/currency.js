export function formatCurrency(lakhs) {
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(1)} Cr`;
  return `₹${lakhs} L`;
}
