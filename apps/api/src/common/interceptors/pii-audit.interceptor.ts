import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PIIAuditService, PIIAction } from '@vms/security';

@Injectable()
export class PIIAuditInterceptor implements NestInterceptor {
  constructor(private readonly piiAuditService: PIIAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      return next.handle();
    }

    const resourceType = this.getResourceType(context);
    const action = this.getAction(request.method);
    
    return next.handle().pipe(
      tap(async (data) => {
        // Only log if this involves PII access
        if (this.involvesPII(resourceType, action)) {
          const piiFields = this.extractPIIFields(data, action);
          
          if (piiFields.length > 0) {
            await this.piiAuditService.logPIIAccess({
              orgId: user.orgId,
              userId: user.id,
              resourceType,
              resourceId: this.getResourceId(data, request),
              action,
              piiFields,
              timestamp: new Date(),
              ipAddress: this.getClientIP(request),
              userAgent: request.get('User-Agent') || 'Unknown',
              purpose: 'OPERATIONAL',
              legalBasis: 'LEGITIMATE_INTEREST',
            });
          }
        }
      }),
    );
  }

  private getResourceType(context: ExecutionContext): string {
    const className = context.getClass().name;
    return className.replace('Controller', '').toUpperCase();
  }

  private getAction(method: string): PIIAction {
    switch (method) {
      case 'GET':
        return PIIAction.VIEW;
      case 'POST':
        return PIIAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return PIIAction.UPDATE;
      case 'DELETE':
        return PIIAction.DELETE;
      default:
        return PIIAction.VIEW;
    }
  }

  private involvesPII(resourceType: string, action: PIIAction): boolean {
    const piiResources = ['VISITOR', 'VISIT'];
    return piiResources.includes(resourceType);
  }

  private extractPIIFields(data: any, action: PIIAction): string[] {
    const piiFields: string[] = [];
    
    if (!data) return piiFields;

    // Check for PII fields in the response/request data
    if (data.email || data.encryptedEmail) {
      piiFields.push('email');
    }
    
    if (data.phone || data.encryptedPhone) {
      piiFields.push('phone');
    }
    
    if (data.photoUrl) {
      piiFields.push('photo');
    }
    
    if (data.signatureUrl) {
      piiFields.push('signature');
    }

    // For arrays of data
    if (Array.isArray(data)) {
      data.forEach(item => {
        const itemFields = this.extractPIIFields(item, action);
        itemFields.forEach(field => {
          if (!piiFields.includes(field)) {
            piiFields.push(field);
          }
        });
      });
    }

    return piiFields;
  }

  private getResourceId(data: any, request: any): string {
    // Try to get ID from response data
    if (data?.id) {
      return data.id;
    }
    
    // Try to get ID from request params
    if (request.params?.id) {
      return request.params.id;
    }
    
    // For bulk operations, use a generic identifier
    if (Array.isArray(data)) {
      return `bulk_${data.length}_items`;
    }
    
    return 'unknown';
  }

  private getClientIP(request: any): string {
    return request.ip || 
           request.connection?.remoteAddress || 
           request.socket?.remoteAddress ||
           request.headers['x-forwarded-for']?.split(',')[0] ||
           'unknown';
  }
}