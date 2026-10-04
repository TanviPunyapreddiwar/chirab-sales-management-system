import { Response, NextFunction } from 'express';
import { AuthRequest, OfferFilters, STATUS_TRANSITIONS, MANAGEMENT_ROLES } from '../types';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, getPagination, buildPaginationMeta } from '../utils/response';
import {
  createOfferSchema,
  updateOfferSchema,
  changeStatusSchema,
  createRevisionSchema,
  createFollowUpSchema,
  createApprovalSchema,
} from '../validators/offer.validator';
import { generateOfferNumber } from '../utils/offerNumber';
import { createAuditLog } from '../utils/auditLogger';
import { Prisma, OfferStatus } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const OFFER_INCLUDE = {
  customer: true,
  salesperson: { select: { id: true, name: true, email: true, employeeCode: true } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { revisions: true, followUps: true, documents: true } },
};

export async function getOffers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as OfferFilters;
    const { skip, take, page: pageNum, limit: limitNum } = getPagination(query.page, query.limit);

    const where: Prisma.OfferWhereInput = {};

    // Role-based filtering: SALES only sees their own offers
    if (req.user?.role === 'SALES') {
      where.salespersonId = req.user.userId;
    }

    if (query.search) {
      where.OR = [
        { offerNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { companyName: { contains: query.search, mode: 'insensitive' } } },
        { product: { contains: query.search, mode: 'insensitive' } },
        { customerRfqNumber: { contains: query.search, mode: 'insensitive' } },
        { salesperson: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.status) where.status = query.status as OfferStatus;
    if (query.salespersonId) where.salespersonId = query.salespersonId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.businessDivision) where.businessDivision = { contains: query.businessDivision, mode: 'insensitive' };
    if (query.dateFrom || query.dateTo) {
      where.offerDate = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo && { lte: new Date(query.dateTo) }),
      };
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        skip,
        take,
        include: OFFER_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.offer.count({ where }),
    ]);

    sendSuccess(res, offers, undefined, 200, buildPaginationMeta(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
}

export async function getOfferById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        ...OFFER_INCLUDE,
        revisions: {
          include: { createdBy: { select: { id: true, name: true } } },
          orderBy: { revisionNumber: 'desc' },
        },
        followUps: {
          include: { createdBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        approvals: {
          include: { approver: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          include: { uploadedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!offer) {
      sendError(res, 'Offer not found', 404);
      return;
    }

    // SALES role can only view their own offers
    if (req.user?.role === 'SALES' && offer.salespersonId !== req.user.userId) {
      sendError(res, 'Access denied', 403);
      return;
    }

    // Fetch audit logs for this offer separately
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: 'Offer', entityId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    sendSuccess(res, { ...offer, auditLogs });
  } catch (error) {
    next(error);
  }
}

export async function createOffer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }

    const parsed = createOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const data = parsed.data;

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) { sendError(res, 'Customer not found', 404); return; }

    // Verify salesperson exists
    const salesperson = await prisma.user.findUnique({ where: { id: data.salespersonId } });
    if (!salesperson) { sendError(res, 'Salesperson not found', 404); return; }

    const offerNumber = await generateOfferNumber();

    const offer = await prisma.offer.create({
      data: {
        offerNumber,
        customerId: data.customerId,
        salespersonId: data.salespersonId,
        contactPerson: data.contactPerson,
        customerRfqNumber: data.customerRfqNumber,
        businessDivision: data.businessDivision,
        product: data.product,
        applicationDescription: data.applicationDescription,
        currency: data.currency,
        offerValue: data.offerValue,
        validityDays: data.validityDays,
        offerDate: data.offerDate ? new Date(data.offerDate) : new Date(),
        nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
        source: data.source,
        commercialRemarks: data.commercialRemarks,
        createdById: req.user.userId,
      },
      include: OFFER_INCLUDE,
    });

    // Create initial revision (Rev-00)
    await prisma.offerRevision.create({
      data: {
        offerId: offer.id,
        revisionNumber: 0,
        offerValue: data.offerValue,
        currency: data.currency,
        status: 'DRAFT',
        description: 'Initial offer',
        commercialRemarks: data.commercialRemarks,
        changeReason: 'Initial offer creation',
        createdById: req.user.userId,
      },
    });

    await createAuditLog({
      userId: req.user.userId,
      action: 'OFFER_CREATED',
      entityType: 'Offer',
      entityId: offer.id,
      newValue: { offerNumber, status: 'DRAFT', offerValue: data.offerValue },
      ipAddress: req.ip,
    });

    sendSuccess(res, offer, `Offer ${offerNumber} created successfully`, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateOffer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }

    const { id } = req.params;
    const parsed = updateOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const existing = await prisma.offer.findUnique({ where: { id } });
    if (!existing) { sendError(res, 'Offer not found', 404); return; }

    if (req.user.role === 'SALES' && existing.salespersonId !== req.user.userId) {
      sendError(res, 'Access denied', 403); return;
    }

    const data = parsed.data;
    const offer = await prisma.offer.update({
      where: { id },
      data: {
        ...data,
        offerValue: data.offerValue !== undefined ? data.offerValue : undefined,
        offerDate: data.offerDate ? new Date(data.offerDate) : undefined,
        nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
      },
      include: OFFER_INCLUDE,
    });

    await createAuditLog({
      userId: req.user.userId,
      action: 'OFFER_UPDATED',
      entityType: 'Offer',
      entityId: id,
      oldValue: { offerValue: Number(existing.offerValue), status: existing.status },
      newValue: data,
    });

    sendSuccess(res, offer, 'Offer updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function changeOfferStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }

    const { id } = req.params;
    const parsed = changeStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const { status: newStatus, remarks } = parsed.data;

    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) { sendError(res, 'Offer not found', 404); return; }

    if (req.user.role === 'SALES' && offer.salespersonId !== req.user.userId) {
      sendError(res, 'Access denied', 403); return;
    }

    // Check status transition rules (management can bypass)
    if (!MANAGEMENT_ROLES.includes(req.user.role)) {
      const allowedTransitions = STATUS_TRANSITIONS[offer.status] || [];
      if (!allowedTransitions.includes(newStatus)) {
        sendError(res, `Cannot transition from ${offer.status} to ${newStatus}`, 400);
        return;
      }
    }

    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: { status: newStatus },
      include: OFFER_INCLUDE,
    });

    await createAuditLog({
      userId: req.user.userId,
      action: 'OFFER_STATUS_CHANGED',
      entityType: 'Offer',
      entityId: id,
      oldValue: { status: offer.status },
      newValue: { status: newStatus, remarks },
    });

    sendSuccess(res, updatedOffer, `Offer status changed to ${newStatus}`);
  } catch (error) {
    next(error);
  }
}

export async function createRevision(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }

    const { id } = req.params;
    const parsed = createRevisionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) { sendError(res, 'Offer not found', 404); return; }

    if (req.user.role === 'SALES' && offer.salespersonId !== req.user.userId) {
      sendError(res, 'Access denied', 403); return;
    }

    const newRevisionNumber = offer.revisionNumber + 1;
    const data = parsed.data;

    const [revision] = await prisma.$transaction([
      prisma.offerRevision.create({
        data: {
          offerId: id,
          revisionNumber: newRevisionNumber,
          offerValue: data.offerValue,
          currency: data.currency,
          status: offer.status,
          description: data.description,
          commercialRemarks: data.commercialRemarks,
          changeReason: data.changeReason,
          createdById: req.user.userId,
        },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
      prisma.offer.update({
        where: { id },
        data: {
          revisionNumber: newRevisionNumber,
          offerValue: data.offerValue,
          currency: data.currency,
          commercialRemarks: data.commercialRemarks,
          status: 'REVISED_OFFER',
        },
      }),
    ]);

    await createAuditLog({
      userId: req.user.userId,
      action: 'REVISION_CREATED',
      entityType: 'Offer',
      entityId: id,
      newValue: { revisionNumber: newRevisionNumber, offerValue: data.offerValue, changeReason: data.changeReason },
    });

    sendSuccess(res, revision, `Revision Rev-${String(newRevisionNumber).padStart(2, '0')} created`, 201);
  } catch (error) {
    next(error);
  }
}

export async function getRevisions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) { sendError(res, 'Offer not found', 404); return; }

    const revisions = await prisma.offerRevision.findMany({
      where: { offerId: id },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { revisionNumber: 'asc' },
    });

    sendSuccess(res, revisions);
  } catch (error) {
    next(error);
  }
}

export async function createFollowUp(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }

    const { id } = req.params;
    const parsed = createFollowUpSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) { sendError(res, 'Offer not found', 404); return; }

    if (req.user.role === 'SALES' && offer.salespersonId !== req.user.userId) {
      sendError(res, 'Access denied', 403); return;
    }

    const data = parsed.data;
    const followUp = await prisma.followUp.create({
      data: {
        offerId: id,
        followUpDate: new Date(data.followUpDate),
        method: data.method,
        customerResponse: data.customerResponse,
        remarks: data.remarks,
        nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
        createdById: req.user.userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    // Update offer's next follow-up date
    if (data.nextFollowUpDate) {
      await prisma.offer.update({
        where: { id },
        data: { nextFollowUpDate: new Date(data.nextFollowUpDate) },
      });
    }

    await createAuditLog({
      userId: req.user.userId,
      action: 'FOLLOW_UP_ADDED',
      entityType: 'Offer',
      entityId: id,
      newValue: { method: data.method, followUpDate: data.followUpDate },
    });

    sendSuccess(res, followUp, 'Follow-up added successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function getFollowUps(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) { sendError(res, 'Offer not found', 404); return; }

    const followUps = await prisma.followUp.findMany({
      where: { offerId: id },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, followUps);
  } catch (error) {
    next(error);
  }
}

export async function createApproval(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }

    const { id } = req.params;
    const parsed = createApprovalSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    if (!['ADMIN', 'MANAGEMENT', 'APPROVER'].includes(req.user.role)) {
      sendError(res, 'Only approvers can perform this action', 403); return;
    }

    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) { sendError(res, 'Offer not found', 404); return; }

    if (offer.status !== 'SUBMITTED_FOR_APPROVAL') {
      sendError(res, 'Offer is not pending approval', 400); return;
    }

    const { action, comments } = parsed.data;
    const newStatus: OfferStatus = action === 'APPROVED' ? 'APPROVED' : 'DRAFT';

    const [approval] = await prisma.$transaction([
      prisma.offerApproval.create({
        data: {
          offerId: id,
          approverId: req.user.userId,
          action,
          comments,
        },
        include: { approver: { select: { id: true, name: true } } },
      }),
      prisma.offer.update({
        where: { id },
        data: { status: newStatus },
      }),
    ]);

    await createAuditLog({
      userId: req.user.userId,
      action: `OFFER_${action}`,
      entityType: 'Offer',
      entityId: id,
      newValue: { action, comments, newStatus },
    });

    sendSuccess(res, approval, `Offer ${action.toLowerCase()}`, 201);
  } catch (error) {
    next(error);
  }
}

export async function uploadDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    if (!req.file) { sendError(res, 'No file uploaded', 400); return; }

    const { id } = req.params;
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) { sendError(res, 'Offer not found', 404); return; }

    const document = await prisma.offerDocument.create({
      data: {
        offerId: id,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        storagePath: req.file.path,
        uploadedById: req.user.userId,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: req.user.userId,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Offer',
      entityId: id,
      newValue: { fileName: req.file.originalname, fileSize: req.file.size },
    });

    sendSuccess(res, document, 'Document uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function downloadDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, docId } = req.params;

    const document = await prisma.offerDocument.findFirst({
      where: { id: docId, offerId: id },
    });

    if (!document) { sendError(res, 'Document not found', 404); return; }

    const filePath = path.resolve(document.storagePath);
    if (!fs.existsSync(filePath)) {
      sendError(res, 'File not found on storage', 404); return;
    }

    res.download(filePath, document.originalName);
  } catch (error) {
    next(error);
  }
}
