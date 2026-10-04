import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Users ────────────────────────────────────────────────────────────────
  // Passwords are temporary. Change all of these before production deployment.
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const salesHash = await bcrypt.hash('Sales@123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@chirabtechnologies.com' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@chirabtechnologies.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
      employeeCode: 'EMP-001',
      phone: '+91 98765 00000',
    },
  });

  await prisma.user.upsert({
    where: { email: 'management@chirabtechnologies.com' },
    update: {},
    create: {
      name: 'Rajesh Kumar',
      email: 'management@chirabtechnologies.com',
      passwordHash: adminHash,
      role: Role.MANAGEMENT,
      employeeCode: 'EMP-002',
      phone: '+91 98765 11111',
    },
  });

  await prisma.user.upsert({
    where: { email: 'laxmikant@chirabtechnologies.com' },
    update: {},
    create: {
      name: 'Laxmikant Sharma',
      email: 'laxmikant@chirabtechnologies.com',
      passwordHash: salesHash,
      role: Role.SALES,
      employeeCode: 'EMP-003',
      phone: '+91 98765 22222',
    },
  });

  await prisma.user.upsert({
    where: { email: 'kaushal@chirabtechnologies.com' },
    update: {},
    create: {
      name: 'Kaushal Patel',
      email: 'kaushal@chirabtechnologies.com',
      passwordHash: salesHash,
      role: Role.SALES,
      employeeCode: 'EMP-004',
      phone: '+91 98765 33333',
    },
  });

  await prisma.user.upsert({
    where: { email: 'approver@chirabtechnologies.com' },
    update: {},
    create: {
      name: 'Vikram Singh',
      email: 'approver@chirabtechnologies.com',
      passwordHash: salesHash,
      role: Role.APPROVER,
      employeeCode: 'EMP-005',
      phone: '+91 98765 44444',
    },
  });

  console.log('Users ready.');

  // ── Offer sequence ────────────────────────────────────────────────────────
  // Initialises the fiscal-year counter at 0 so the first real offer created
  // through the API generates offer number CH/26-27/00001.
  // The upsert leaves any existing sequence value untouched (update: {}).
  await prisma.offerSequence.upsert({
    where: { year: '26-27' },
    update: {},
    create: { year: '26-27', sequence: 0 },
  });

  console.log('Offer sequence ready.');
  console.log('Handover seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
