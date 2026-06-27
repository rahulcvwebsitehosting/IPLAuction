const { toLakhs, toCrores, formatCurrency } = require("../utilities/currency");

describe("toLakhs", () => {
  it("converts crores to lakhs", () => {
    expect(toLakhs(1)).toBe(100);
    expect(toLakhs(12)).toBe(1200);
    expect(toLakhs(0.5)).toBe(50);
  });
});

describe("toCrores", () => {
  it("converts lakhs to crores", () => {
    expect(toCrores(100)).toBe(1);
    expect(toCrores(1200)).toBe(12);
    expect(toCrores(50)).toBe(0.5);
  });
});

describe("formatCurrency", () => {
  it("formats values >= 100 as crores", () => {
    const result = formatCurrency(1200);
    expect(result).toContain("Cr");
    expect(result).toContain("12");
  });

  it("formats values < 100 as lakhs", () => {
    const result = formatCurrency(50);
    expect(result).toContain("L");
    expect(result).toContain("50");
  });
});
