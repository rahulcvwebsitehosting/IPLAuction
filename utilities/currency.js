const LAKH_PER_CRORE = 100;

function toLakhs(crores) {
  return Math.round(crores * LAKH_PER_CRORE);
}

function toCrores(lakhs) {
  return parseFloat((lakhs / LAKH_PER_CRORE).toFixed(2));
}

function formatCurrency(lakhs) {
  if (lakhs >= LAKH_PER_CRORE) {
    return `${toCrores(lakhs)} Cr`;
  }
  return `${lakhs} L`;
}

module.exports = { toLakhs, toCrores, formatCurrency, LAKH_PER_CRORE };
