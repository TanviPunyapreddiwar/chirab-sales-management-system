import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, getPagination, buildPaginationMeta } from '../utils/response';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator';
import { generateCustomerCode } from '../utils/customerCode';
import { createAuditLog } from '../utils/auditLogger';
import { Prisma } from '@prisma/client';

export async function getCustomers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, search } = req.query as Record<string, string>;
    const { skip, take, page: pageNum, limit: limitNum } = getPagination(page, limit);

    const where: Prisma.CustomerWhereInput = {
      isActive: true,
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { customerCode: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { companyName: 'asc' },
        include: {
          _count: { select: { offers: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    sendSuccess(res, customers, undefined, 200, buildPaginationMeta(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
}

export async function getCustomerById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        offers: {
          include: {
            salesperson: { select: { id: true, name: true } },
            _count: { select: { revisions: true, followUps: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      sendError(res, 'Customer not found', 404);
      return;
    }

    // Calculate stats
    const totalQuoted = customer.offers.reduce((sum, o) => sum + Number(o.offerValue), 0);
    const wonValue = customer.offers
      .filter((o) => o.status === 'WON')
      .reduce((sum, o) => sum + Number(o.offerValue), 0);
    const openOffers = customer.offers.filter(
      (o) => !['WON', 'LOST', 'CANCELLED'].includes(o.status)
    ).length;

    sendSuccess(res, {
      ...customer,
      stats: { totalQuoted, wonValue, openOffers, totalOffers: customer.offers.length },
    });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const customerCode = await generateCustomerCode();
    const { email, ...rest } = parsed.data;

    const customer = await prisma.customer.create({
      data: {
        ...rest,
        email: email || undefined,
        customerCode,
      },
    });

    await createAuditLog({
      userId: req.user?.userId,
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: customer.id,
      newValue: { companyName: customer.companyName, customerCode },
    });

    sendSuccess(res, customer, 'Customer created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const parsed = updateCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Customer not found', 404);
      return;
    }

    const { email, ...rest } = parsed.data;
    const updateData = email !== undefined ? { ...rest, email: email || null } : rest;

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId: req.user?.userId,
      action: 'CUSTOMER_UPDATED',
      entityType: 'Customer',
      entityId: id,
      oldValue: { companyName: existing.companyName },
      newValue: { companyName: customer.companyName },
    });

    sendSuccess(res, customer, 'Customer updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Customer not found', 404);
      return;
    }

    // Soft delete
    await prisma.customer.update({ where: { id }, data: { isActive: false } });

    await createAuditLog({
      userId: req.user?.userId,
      action: 'CUSTOMER_DELETED',
      entityType: 'Customer',
      entityId: id,
      oldValue: { companyName: existing.companyName },
    });

    sendSuccess(res, null, 'Customer deactivated successfully');
  } catch (error) {
    next(error);
  }
}
