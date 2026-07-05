// ─── Financial Year helpers (India: Apr 1 – Mar 31) ──────────────
// Mirrors the backend util so the dashboard and reports agree on how a
// financial year is defined. FY "start year" is the calendar year of April 1
// (e.g. FY 2026-27 starts 2026-04-01 and ends 2027-03-31).

export interface FinancialYearOption {
  startYear: number;
  label: string; // e.g. "FY 2026-27"
  start: string; // YYYY-MM-DD (Apr 1)
  end: string; // YYYY-MM-DD (Mar 31)
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The FY start year a given date falls into. */
export function financialYearStart(date: Date = new Date()): number {
  const month = date.getMonth(); // 0 = Jan, 3 = Apr
  return month >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

/** Human label for a FY start year, e.g. 2026 -> "FY 2026-27". */
export function financialYearLabel(startYear: number): string {
  return `FY ${startYear}-${(startYear + 1).toString().slice(-2)}`;
}

/** Full option (label + ISO date bounds) for a FY start year. */
export function financialYearOption(startYear: number): FinancialYearOption {
  return {
    startYear,
    label: financialYearLabel(startYear),
    start: iso(new Date(startYear, 3, 1)),
    end: iso(new Date(startYear + 1, 2, 31)),
  };
}

/**
 * Current FY plus the previous (count - 1) years, most recent first.
 * Defaults to 6 entries (current + previous 5).
 */
export function listFinancialYears(count = 6, from: Date = new Date()): FinancialYearOption[] {
  const current = financialYearStart(from);
  return Array.from({ length: count }, (_, i) => financialYearOption(current - i));
}
