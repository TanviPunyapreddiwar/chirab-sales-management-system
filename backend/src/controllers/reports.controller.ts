import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

function getDateFilter(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return undefined;
  return {
    ...(dateFrom && { gte: new Date(dateFrom) }),
    ...(dateTo && { lte: new Date(dateTo) }),
  };
}

export async function getOfferSummaryReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { dateFrom, dateTo, salespersonId, businessDivision } = req.query as Record<string, string>;

    const where = {
      ...(dateFrom || dateTo ? { offerDate: getDateFilter(dateFrom, dateTo) } : {}),
      ...(salespersonId ? { salespersonId } : {}),
      ...(businessDivision ? { businessDivision: { contains: businessDivision, mode: 'insensitive' as const } } : {}),
      ...(req.user?.role === 'SALES' ? { salespersonId: req.user.userId } : {}),
    };

    const offers = await prisma.offer.findMany({
      where,
      include: {
        customer: { select: { companyName: true } },
        salesperson: { select: { name: true } },
      },
      orderBy: { offerDate: 'desc' },
    });

    const summary = {
      total: offers.length,
      totalValue: offers.reduce((s, o) => s + Number(o.offerValue), 0),
      won: offers.filter((o) => o.status === 'WON').length,
      wonValue: offers.filter((o) => o.status === 'WON').reduce((s, o) => s + Number(o.offerValue), 0),
      lost: offers.filter((o) => o.status === 'LOST').length,
      open: offers.filter((o) => !['WON', 'LOST', 'CANCELLED'].includes(o.status)).length,
    };

    sendSuccess(res, { summary, offers });
  } catch (error) {
    next(error);
  }
}

export async function getSalespersonPerformance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.role === 'SALES') {
      sendError(res, 'Access denied', 403); return;
    }

    const { dateFrom, dateTo } = req.query as Record<string, string>;
    const dateFilter = dateFrom || dateTo ? { offerDate: getDateFilter(dateFrom, dateTo) } : {};

    const salespeople = await prisma.user.findMany({
      where: { isActive: true, role: { in: ['SALES', 'MANAGEMENT'] } },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        offersAssigned: {
          where: dateFilter,
          select: { status: true, offerValue: true },
        },
      },
    });

    const performance = salespeople.map((sp) => {
      const offers = sp.offersAssigned;
      return {
        id: sp.id,
        name: sp.name,
        employeeCode: sp.employeeCode,
        totalOffers: offers.length,
        totalValue: offers.reduce((s, o) => s + Number(o.offerValue), 0),
        wonOffers: offers.filter((o) => o.status === 'WON').length,
        wonValue: offers.filter((o) => o.status === 'WON').reduce((s, o) => s + Number(o.offerValue), 0),
        lostOffers: offers.filter((o) => o.status === 'LOST').length,
        openOffers: offers.filter((o) => !['WON', 'LOST', 'CANCELLED'].includes(o.status)).length,
        conversionRate: offers.length > 0
          ? Math.round((offers.filter((o) => o.status === 'WON').length / offers.length) * 100)
          : 0,
      };
    });

    sendSuccess(res, performance);
  } catch (error) {
    next(error);
  }
}

export async function getWonLostAnalysis(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { dateFrom, dateTo } = req.query as Record<string, string>;
    const dateFilter = dateFrom || dateTo ? { offerDate: getDateFilter(dateFrom, dateTo) } : {};
    const roleFilter = req.user?.role === 'SALES' ? { salespersonId: req.user.userId } : {};

    const [won, lost, byDivision] = await Promise.all([
      prisma.offer.aggregate({
        where: { ...roleFilter, ...dateFilter, status: 'WON' },
        _count: { id: true },
        _sum: { offerValue: true },
      }),
      prisma.offer.aggregate({
        where: { ...roleFilter, ...dateFilter, status: 'LOST' },
        _count: { id: true },
        _sum: { offerValue: true },
      }),
      prisma.offer.groupBy({
        by: ['businessDivision', 'status'],
        where: {
          ...roleFilter,
          ...dateFilter,
          status: { in: ['WON', 'LOST'] },
          businessDivision: { not: null },
        },
        _count: { id: true },
        _sum: { offerValue: true },
      }),
    ]);

    sendSuccess(res, {
      won: { count: won._count.id, value: Number(won._sum.offerValue || 0) },
      lost: { count: lost._count.id, value: Number(lost._sum.offerValue || 0) },
      byDivision: byDivision.map((d) => ({
        division: d.businessDivision,
        status: d.status,
        count: d._count.id,
        value: Number(d._sum.offerValue || 0),
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function getFollowUpReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { dateFrom, dateTo } = req.query as Record<string, string>;
    const roleFilter = req.user?.role === 'SALES' ? { offer: { salespersonId: req.user.userId } } : {};

    const followUps = await prisma.followUp.findMany({
      where: {
        ...roleFilter,
        ...(dateFrom || dateTo ? { followUpDate: getDateFilter(dateFrom, dateTo) } : {}),
      },
      include: {
        offer: {
          select: {
            offerNumber: true,
            product: true,
            customer: { select: { companyName: true } },
            salesperson: { select: { name: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { followUpDate: 'desc' },
    });

    sendSuccess(res, followUps);
  } catch (error) {
    next(error);
  }
}
