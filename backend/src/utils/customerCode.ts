import { prisma } from '../config/prisma';

/**
 * Generates a unique customer code.
 * Format: CUST-00001
 */
export async function generateCustomerCode(): Promise<string> {
  const count = await prisma.customer.count();
  const nextNum = count + 1;
  return `CUST-${String(nextNum).padStart(5, '0')}`;
}
