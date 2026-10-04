import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../types';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, getPagination, buildPaginationMeta } from '../utils/response';
import { createUserSchema, updateUserSchema, resetPasswordSchema } from '../validators/user.validator';
import { createAuditLog } from '../utils/auditLogger';
import { Prisma } from '@prisma/client';

export async function getUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, search } = req.query as Record<string, string>;
    const { skip, take, page: pageNum, limit: limitNum } = getPagination(page, limit);

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { employeeCode: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeCode: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, users, undefined, 200, buildPaginationMeta(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
}

export async function getSalespeople(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const salespeople = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['SALES', 'MANAGEMENT', 'ADMIN'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, salespeople);
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeCode: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const { password, email, ...rest } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      sendError(res, 'Email already in use', 409);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        ...rest,
        email: email.toLowerCase(),
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeCode: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      userId: req.user?.userId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      newValue: { name: user.name, email: user.email, role: user.role },
    });

    sendSuccess(res, user, 'User created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'User not found', 404);
      return;
    }

    const { email, ...rest } = parsed.data;
    const updateData = email ? { ...rest, email: email.toLowerCase() } : rest;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeCode: true,
        phone: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      userId: req.user?.userId,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      oldValue: { name: existing.name, email: existing.email, role: existing.role, isActive: existing.isActive },
      newValue: updateData,
    });

    sendSuccess(res, user, 'User updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }

    const { id } = req.params;

    // An Admin must use the self-service change-password endpoint for their own account
    if (id === req.user.userId) {
      sendError(res, 'Use the change-password endpoint to update your own password', 400);
      return;
    }

    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      sendError(res, 'User not found', 404);
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Audit log — password is intentionally excluded from oldValue/newValue
    await createAuditLog({
      userId: req.user.userId,
      action: 'USER_PASSWORD_RESET',
      entityType: 'User',
      entityId: id,
      newValue: { resetBy: req.user.email, targetUser: target.email },
    });

    sendSuccess(res, null, 'User password reset successfully');
  } catch (error) {
    next(error);
  }
}
