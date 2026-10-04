import { prisma } from '../config/prisma';

/**
 * Generates the fiscal year string based on current date.
 * India fiscal year: April to March. E.g., 2026-04-01 → "26-27"
 */
export function getCurrentFiscalYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed

  let startYear: number;
  if (month >= 4) {
    startYear = year;
  } else {
    startYear = year - 1;
  }

  const yy1 = String(startYear).slice(-2);
  const yy2 = String(startYear + 1).slice(-2);
  return `${yy1}-${yy2}`;
}

/**
 * Generates a unique offer number using database transaction.
 * Format: CH/26-27/00001
 * Thread-safe via database transaction and atomic update.
 */
export async function generateOfferNumber(): Promise<string> {
  const fiscalYear = getCurrentFiscalYear();

  const result = await prisma.$transaction(async (tx) => {
    // Upsert the sequence for this fiscal year
    const sequence = await tx.offerSequence.upsert({
      where: { year: fiscalYear },
      update: { sequence: { increment: 1 } },
      create: { year: fiscalYear, sequence: 1 },
    });

    const seqNum = String(sequence.sequence).padStart(5, '0');
    return `CH/${fiscalYear}/${seqNum}`;
  });

  return result;
}
