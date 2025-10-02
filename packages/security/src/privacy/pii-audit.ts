export interface PIIAuditLog {
  id: string;
  orgId: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  action: PIIAction;
  piiFields: string[];
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  purpose?: string;
  legalBasis?: string;
}

export enum PIIAction {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT',
  SEARCH = 'SEARCH',
  DECRYPT = 'DECRYPT',
}

export interface DataRetentionPolicy {
  orgId: string;
  resourceType: string;
  retentionPeriodDays: number;
  autoDeleteEnabled: boolean;
  legalHoldExemption: boolean;
  lastUpdated: Date;
  updatedBy: string;
}

export interface GDPRRequest {
  id: string;
  orgId: string;
  requestType: GDPRRequestType;
  subjectEmail: string;
  subjectPhone?: string;
  status: GDPRRequestStatus;
  requestedAt: Date;
  completedAt?: Date;
  requestedBy: string;
  verificationToken: string;
  exportData?: any;
  deletionSummary?: DeletionSummary;
}

export enum GDPRRequestType {
  EXPORT = 'EXPORT',
  DELETE = 'DELETE',
  RECTIFICATION = 'RECTIFICATION',
  PORTABILITY = 'PORTABILITY',
}

export enum GDPRRequestStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export interface DeletionSummary {
  visitorsDeleted: number;
  visitsDeleted: number;
  photosDeleted: number;
  signaturesDeleted: number;
  auditLogsRetained: number;
  tombstonesCreated: number;
}

export class PIIAuditService {
  constructor(
    private readonly prisma: any, // PrismaService
    private readonly encryptionService: any // FieldEncryption
  ) {}

  /**
   * Log PII access for audit trail
   */
  async logPIIAccess(log: Omit<PIIAuditLog, 'id'>): Promise<void> {
    await this.prisma.piiAuditLog.create({
      data: {
        orgId: log.orgId,
        userId: log.userId,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        action: log.action,
        piiFields: log.piiFields,
        timestamp: log.timestamp,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        purpose: log.purpose,
        legalBasis: log.legalBasis,
      },
    });
  }

  /**
   * Get PII access logs for a specific resource
   */
  async getPIIAccessLogs(
    orgId: string,
    resourceType?: string,
    resourceId?: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<PIIAuditLog[]> {
    return this.prisma.piiAuditLog.findMany({
      where: {
        orgId,
        ...(resourceType && { resourceType }),
        ...(resourceId && { resourceId }),
        ...(fromDate && toDate && {
          timestamp: {
            gte: fromDate,
            lte: toDate,
          },
        }),
      },
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Create GDPR export request
   */
  async createGDPRExportRequest(
    orgId: string,
    subjectEmail: string,
    subjectPhone: string | undefined,
    requestedBy: string
  ): Promise<GDPRRequest> {
    const verificationToken = this.generateVerificationToken();

    const request = await this.prisma.gdprRequest.create({
      data: {
        orgId,
        requestType: GDPRRequestType.EXPORT,
        subjectEmail,
        subjectPhone,
        status: GDPRRequestStatus.PENDING_VERIFICATION,
        requestedAt: new Date(),
        requestedBy,
        verificationToken,
      },
    });

    // Send verification email
    await this.sendVerificationEmail(subjectEmail, verificationToken);

    return request;
  }

  /**
   * Create GDPR deletion request
   */
  async createGDPRDeletionRequest(
    orgId: string,
    subjectEmail: string,
    subjectPhone: string | undefined,
    requestedBy: string
  ): Promise<GDPRRequest> {
    const verificationToken = this.generateVerificationToken();

    const request = await this.prisma.gdprRequest.create({
      data: {
        orgId,
        requestType: GDPRRequestType.DELETE,
        subjectEmail,
        subjectPhone,
        status: GDPRRequestStatus.PENDING_VERIFICATION,
        requestedAt: new Date(),
        requestedBy,
        verificationToken,
      },
    });

    // Send verification email
    await this.sendVerificationEmail(subjectEmail, verificationToken);

    return request;
  }

  /**
   * Verify GDPR request
   */
  async verifyGDPRRequest(token: string): Promise<GDPRRequest> {
    const request = await this.prisma.gdprRequest.findFirst({
      where: {
        verificationToken: token,
        status: GDPRRequestStatus.PENDING_VERIFICATION,
      },
    });

    if (!request) {
      throw new Error('Invalid or expired verification token');
    }

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - request.requestedAt.getTime();
    if (tokenAge > 24 * 60 * 60 * 1000) {
      await this.prisma.gdprRequest.update({
        where: { id: request.id },
        data: { status: GDPRRequestStatus.EXPIRED },
      });
      throw new Error('Verification token has expired');
    }

    const updatedRequest = await this.prisma.gdprRequest.update({
      where: { id: request.id },
      data: { status: GDPRRequestStatus.VERIFIED },
    });

    // Queue the request for processing
    await this.queueGDPRProcessing(updatedRequest);

    return updatedRequest;
  }

  /**
   * Process GDPR export request
   */
  async processGDPRExport(requestId: string): Promise<void> {
    const request = await this.prisma.gdprRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.status !== GDPRRequestStatus.VERIFIED) {
      throw new Error('Invalid request for processing');
    }

    await this.prisma.gdprRequest.update({
      where: { id: requestId },
      data: { status: GDPRRequestStatus.IN_PROGRESS },
    });

    try {
      // Find all visitor data
      const visitors = await this.findVisitorsByContact(
        request.orgId,
        request.subjectEmail,
        request.subjectPhone
      );

      const exportData = {
        request: {
          id: request.id,
          type: request.requestType,
          requestedAt: request.requestedAt,
          processedAt: new Date(),
        },
        personalData: await this.collectPersonalData(visitors),
        visits: await this.collectVisitData(visitors.map(v => v.id)),
        auditLogs: await this.collectAuditData(request.orgId, visitors.map(v => v.id)),
      };

      await this.prisma.gdprRequest.update({
        where: { id: requestId },
        data: {
          status: GDPRRequestStatus.COMPLETED,
          completedAt: new Date(),
          exportData,
        },
      });

      // Send export data to user
      await this.sendExportData(request.subjectEmail, exportData);

    } catch (error) {
      await this.prisma.gdprRequest.update({
        where: { id: requestId },
        data: { status: GDPRRequestStatus.REJECTED },
      });
      throw error;
    }
  }

  /**
   * Process GDPR deletion request
   */
  async processGDPRDeletion(requestId: string): Promise<void> {
    const request = await this.prisma.gdprRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.status !== GDPRRequestStatus.VERIFIED) {
      throw new Error('Invalid request for processing');
    }

    await this.prisma.gdprRequest.update({
      where: { id: requestId },
      data: { status: GDPRRequestStatus.IN_PROGRESS },
    });

    try {
      const visitors = await this.findVisitorsByContact(
        request.orgId,
        request.subjectEmail,
        request.subjectPhone
      );

      const deletionSummary = await this.performDeletion(visitors);

      await this.prisma.gdprRequest.update({
        where: { id: requestId },
        data: {
          status: GDPRRequestStatus.COMPLETED,
          completedAt: new Date(),
          deletionSummary,
        },
      });

      // Send confirmation to user
      await this.sendDeletionConfirmation(request.subjectEmail, deletionSummary);

    } catch (error) {
      await this.prisma.gdprRequest.update({
        where: { id: requestId },
        data: { status: GDPRRequestStatus.REJECTED },
      });
      throw error;
    }
  }

  /**
   * Set up data retention policies
   */
  async setDataRetentionPolicy(policy: Omit<DataRetentionPolicy, 'lastUpdated'>): Promise<void> {
    await this.prisma.dataRetentionPolicy.upsert({
      where: {
        orgId_resourceType: {
          orgId: policy.orgId,
          resourceType: policy.resourceType,
        },
      },
      update: {
        retentionPeriodDays: policy.retentionPeriodDays,
        autoDeleteEnabled: policy.autoDeleteEnabled,
        legalHoldExemption: policy.legalHoldExemption,
        lastUpdated: new Date(),
        updatedBy: policy.updatedBy,
      },
      create: {
        ...policy,
        lastUpdated: new Date(),
      },
    });
  }

  /**
   * Run data retention cleanup
   */
  async runDataRetentionCleanup(orgId: string): Promise<void> {
    const policies = await this.prisma.dataRetentionPolicy.findMany({
      where: { orgId, autoDeleteEnabled: true },
    });

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);

      switch (policy.resourceType) {
        case 'VISITOR':
          await this.deleteOldVisitors(orgId, cutoffDate);
          break;
        case 'VISIT':
          await this.deleteOldVisits(orgId, cutoffDate);
          break;
        case 'AUDIT_LOG':
          await this.deleteOldAuditLogs(orgId, cutoffDate);
          break;
      }
    }
  }

  private async findVisitorsByContact(
    orgId: string,
    email: string,
    phone?: string
  ): Promise<any[]> {
    // This would need to handle encrypted fields
    // Implementation depends on your encryption strategy
    return this.prisma.visitor.findMany({
      where: {
        OR: [
          { emailHash: this.encryptionService.hashField(email) },
          ...(phone ? [{ phoneHash: this.encryptionService.hashField(phone) }] : []),
        ],
      },
    });
  }

  private async collectPersonalData(visitors: any[]): Promise<any> {
    // Decrypt and collect all personal data
    const personalData = [];
    
    for (const visitor of visitors) {
      const decryptedEmail = await this.encryptionService.decryptField(visitor.encryptedEmail);
      const decryptedPhone = visitor.encryptedPhone 
        ? await this.encryptionService.decryptField(visitor.encryptedPhone)
        : null;

      personalData.push({
        id: visitor.id,
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        email: decryptedEmail,
        phone: decryptedPhone,
        company: visitor.company,
        createdAt: visitor.createdAt,
        updatedAt: visitor.updatedAt,
      });
    }

    return personalData;
  }

  private async collectVisitData(visitorIds: string[]): Promise<any> {
    return this.prisma.visit.findMany({
      where: { visitorId: { in: visitorIds } },
      include: {
        location: { select: { name: true } },
        host: { select: { firstName: true, lastName: true } },
      },
    });
  }

  private async collectAuditData(orgId: string, visitorIds: string[]): Promise<any> {
    return this.prisma.auditLog.findMany({
      where: {
        orgId,
        resourceType: 'VISITOR',
        resourceId: { in: visitorIds },
      },
    });
  }

  private async performDeletion(visitors: any[]): Promise<DeletionSummary> {
    const summary: DeletionSummary = {
      visitorsDeleted: 0,
      visitsDeleted: 0,
      photosDeleted: 0,
      signaturesDeleted: 0,
      auditLogsRetained: 0,
      tombstonesCreated: 0,
    };

    for (const visitor of visitors) {
      // Delete associated visits
      const visits = await this.prisma.visit.findMany({
        where: { visitorId: visitor.id },
      });

      for (const visit of visits) {
        // Delete photos and signatures from storage
        if (visit.photoUrl) {
          await this.deleteFile(visit.photoUrl);
          summary.photosDeleted++;
        }
        if (visit.signatureUrl) {
          await this.deleteFile(visit.signatureUrl);
          summary.signaturesDeleted++;
        }
      }

      // Delete visits
      await this.prisma.visit.deleteMany({
        where: { visitorId: visitor.id },
      });
      summary.visitsDeleted += visits.length;

      // Create tombstone record
      await this.prisma.visitorTombstone.create({
        data: {
          originalId: visitor.id,
          orgId: visitor.orgId,
          deletedAt: new Date(),
          deletionReason: 'GDPR_REQUEST',
          hashedIdentifiers: {
            emailHash: visitor.emailHash,
            phoneHash: visitor.phoneHash,
          },
        },
      });
      summary.tombstonesCreated++;

      // Delete visitor
      await this.prisma.visitor.delete({
        where: { id: visitor.id },
      });
      summary.visitorsDeleted++;
    }

    // Audit logs are retained for compliance
    summary.auditLogsRetained = await this.prisma.auditLog.count({
      where: {
        resourceType: 'VISITOR',
        resourceId: { in: visitors.map(v => v.id) },
      },
    });

    return summary;
  }

  private generateVerificationToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private async sendVerificationEmail(email: string, token: string): Promise<void> {
    // Implementation depends on your email service
    console.log(`Sending verification email to ${email} with token ${token}`);
  }

  private async sendExportData(email: string, data: any): Promise<void> {
    // Implementation depends on your email service
    console.log(`Sending export data to ${email}`);
  }

  private async sendDeletionConfirmation(email: string, summary: DeletionSummary): Promise<void> {
    // Implementation depends on your email service
    console.log(`Sending deletion confirmation to ${email}`, summary);
  }

  private async queueGDPRProcessing(request: GDPRRequest): Promise<void> {
    // Queue for background processing
    console.log(`Queuing GDPR request ${request.id} for processing`);
  }

  private async deleteFile(url: string): Promise<void> {
    // Implementation depends on your file storage service
    console.log(`Deleting file: ${url}`);
  }

  private async deleteOldVisitors(orgId: string, cutoffDate: Date): Promise<void> {
    // Implementation for visitor cleanup
  }

  private async deleteOldVisits(orgId: string, cutoffDate: Date): Promise<void> {
    // Implementation for visit cleanup
  }

  private async deleteOldAuditLogs(orgId: string, cutoffDate: Date): Promise<void> {
    // Implementation for audit log cleanup
  }
}