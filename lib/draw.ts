/**
 * Splits `total` questions across domains in proportion to their weights, using the
 * largest-remainder method so the counts always add up to `total` exactly.
 *
 *   allocate(125, CISSP weights) → d1 20, d2 13, d3 16, d4 16, d5 16, d6 15, d7 16, d8 13
 */
export function allocate(total: number, domains: { key: string; weight: number }[]): Map<string, number> {
  const sum = domains.reduce((n, d) => n + d.weight, 0);
  if (sum <= 0 || total <= 0) return new Map(domains.map((d) => [d.key, 0]));
  const shares = domains.map((d, i) => {
    const exact = (total * d.weight) / sum;
    return { key: d.key, i, floor: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = total - shares.reduce((n, s) => n + s.floor, 0);
  // Biggest remainders get the spare questions; ties go to the earlier (usually heavier) domain.
  for (const s of [...shares].sort((a, b) => b.rest - a.rest || a.i - b.i)) {
    if (left === 0) break;
    s.floor += 1;
    left -= 1;
  }
  return new Map(shares.map((s) => [s.key, s.floor]));
}
