import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../types';
import { prisma } from '../config/prisma';
import { sendSuccess, getPagination, buildPaginationMeta } from '../utils/response';

export async function getDocuments(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { page, limit, search } = req.query as Record<string, string>;
    const { skip, take, page: pageNum, limit: limitNum } = getPagination(page, limit);

    // SALES role may only see documents on offers assigned to them
    const offerFilter: Prisma.OfferWhereInput =
      req.user?.role === 'SALES' ? { salespersonId: req.user.userId } : {};

    // Build the where clause for OfferDocument
    const where: Prisma.OfferDocumentWhereInput = {
      offer: offerFilter,
      ...(search && {
        OR: [
          { originalName: { contains: search, mode: 'insensitive' } },
          { offer: { offerNumber: { contains: search, mode: 'insensitive' } } },
          { offer: { customer: { companyName: { contains: search, mode: 'insensitive' } } } },
          { uploadedBy: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [documents, total] = await Promise.all([
      prisma.offerDocument.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          offerId: true,
          fileName: true,
          originalName: true,
          fileType: true,
          fileSize: true,
          createdAt: true,
          uploadedBy: {
            select: { id: true, name: true },
          },
          offer: {
            select: {
              id: true,
              offerNumber: true,
              customer: {
                select: { id: true, companyName: true },
              },
            },
          },
        },
      }),
      prisma.offerDocument.count({ where }),
    ]);

    sendSuccess(res, documents, undefined, 200, buildPaginationMeta(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
}
