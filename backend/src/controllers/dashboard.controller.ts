import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { Prisma } from '@prisma/client';

export async function getDashboardSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    // SALES sees only their own data
    const offerFilter: Prisma.OfferWhereInput =
      role === 'SALES' ? { salespersonId: userId } : {};

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 7);

    const [
      totalOffers,
      openOffers,
      wonOffers,
      lostOffers,
      followUpsDue,
      offersByStatus,
      offersBySalesperson,
      monthlyData,
      topCustomers,
    ] = await Promise.all([
      // Total offers
      prisma.offer.count({ where: offerFilter }),

      // Open offers (not won/lost/cancelled)
      prisma.offer.count({
        where: { ...offerFilter, status: { notIn: ['WON', 'LOST', 'CANCELLED'] } },
      }),

      // Won offers
      prisma.offer.count({ where: { ...offerFilter, status: 'WON' } }),

      // Lost offers
      prisma.offer.count({ where: { ...offerFilter, status: 'LOST' } }),

      // Follow-ups due in next 7 days
      prisma.offer.count({
        where: {
          ...offerFilter,
          nextFollowUpDate: { gte: new Date(), lte: tomorrow },
          status: { notIn: ['WON', 'LOST', 'CANCELLED'] },
        },
      }),

      // Offers by status
      prisma.offer.groupBy({
        by: ['status'],
        where: offerFilter,
        _count: { id: true },
        _sum: { offerValue: true },
      }),

      // Offers by salesperson (management only)
      role !== 'SALES'
        ? prisma.offer.groupBy({
            by: ['salespersonId'],
            _count: { id: true },
            _sum: { offerValue: true },
          })
        : Promise.resolve([]),

      // Monthly offer trend (last 6 months)
      prisma.$queryRaw<{ month: string; count: bigint; total: string }[]>`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "offerDate"), 'Mon YY') as month,
          COUNT(*) as count,
          COALESCE(SUM("offerValue"), 0)::text as total
        FROM offers
        WHERE "offerDate" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "offerDate")
        ORDER BY DATE_TRUNC('month', "offerDate") ASC
      `,

      // Top customers by offer value
      prisma.offer.groupBy({
        by: ['customerId'],
        where: offerFilter,
        _sum: { offerValue: true },
        _count: { id: true },
        orderBy: { _sum: { offerValue: 'desc' } },
        take: 5,
      }),
    ]);

    // Calculate financial totals
    const totalQuoted = await prisma.offer.aggregate({
      where: offerFilter,
      _sum: { offerValue: true },
    });

    const wonValue = await prisma.offer.aggregate({
      where: { ...offerFilter, status: 'WON' },
      _sum: { offerValue: true },
    });

    const conversionRate = totalOffers > 0 ? Math.round((wonOffers / totalOffers) * 100) : 0;

    // Fetch salesperson names for groupBy results
    let salespersonStats: Array<{ salesperson: string; count: number; value: number }> = [];
    if (role !== 'SALES' && offersBySalesperson.length > 0) {
      const salespersonIds = offersBySalesperson.map((s) => s.salespersonId);
      const salespersonUsers = await prisma.user.findMany({
        where: { id: { in: salespersonIds } },
        select: { id: true, name: true },
      });
      const nameMap = new Map(salespersonUsers.map((u) => [u.id, u.name]));

      salespersonStats = offersBySalesperson.map((s) => ({
        salesperson: nameMap.get(s.salespersonId) || 'Unknown',
        count: s._count.id,
        value: Number(s._sum.offerValue || 0),
      }));
    }

    // Customer names for top customers
    let customerStats: Array<{ customer: string; count: number; value: number }> = [];
    if (topCustomers.length > 0) {
      const customerIds = topCustomers.map((c) => c.customerId);
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, companyName: true },
      });
      const nameMap = new Map(customers.map((c) => [c.id, c.companyName]));
      customerStats = topCustomers.map((c) => ({
        customer: nameMap.get(c.customerId) || 'Unknown',
        count: c._count.id,
        value: Number(c._sum.offerValue || 0),
      }));
    }

    sendSuccess(res, {
      kpis: {
        totalOffers,
        openOffers,
        wonOffers,
        lostOffers,
        followUpsDue,
        totalQuoted: Number(totalQuoted._sum.offerValue || 0),
        wonValue: Number(wonValue._sum.offerValue || 0),
        conversionRate,
      },
      offersByStatus: offersByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
        value: Number(s._sum.offerValue || 0),
      })),
      offersBySalesperson: salespersonStats,
      monthlyTrend: monthlyData.map((m) => ({
        month: m.month,
        count: Number(m.count),
        total: Number(m.total),
      })),
      topCustomers: customerStats,
    });
  } catch (error) {
    next(error);
  }
}

export async function getFollowUpsDue(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = req.user?.role;
    const userId = req.user?.userId;

    const where: Prisma.OfferWhereInput = {
      nextFollowUpDate: { lte: new Date(new Date().setDate(new Date().getDate() + 7)) },
      status: { notIn: ['WON', 'LOST', 'CANCELLED'] },
      ...(role === 'SALES' ? { salespersonId: userId } : {}),
    };

    const offers = await prisma.offer.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true } },
        salesperson: { select: { id: true, name: true } },
      },
      orderBy: { nextFollowUpDate: 'asc' },
      take: 50,
    });

    sendSuccess(res, offers);
  } catch (error) {
    next(error);
  }
}
