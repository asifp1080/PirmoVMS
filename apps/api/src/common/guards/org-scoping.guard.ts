import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrgScopingGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      return false;
    }

    // Extract org_id from params or body
    const orgId = request.params.orgId || request.body.org_id;
    
    if (!orgId) {
      // If no org_id in request, allow (will be handled by business logic)
      return true;
    }

    // Check if user belongs to the organization
    if (user.org_id !== orgId) {
      throw new ForbiddenException('Access denied to this organization');
    }

    // Store org_id in request for easy access
    request.orgId = orgId;
    
    return true;
  }
}