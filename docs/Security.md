# VMS Security Documentation

## Overview

This document outlines the comprehensive security measures implemented in the Visitor Management System (VMS) to protect Personally Identifiable Information (PII) and ensure compliance with privacy regulations including GDPR, CCPA, and other data protection laws.

## Threat Model (STRIDE Analysis)

### Spoofing
**Threats:**
- Unauthorized users impersonating legitimate employees
- Kiosk devices being compromised to collect visitor data
- API endpoints being accessed with forged credentials

**Mitigations:**
- Multi-factor authentication for admin users
- JWT tokens with short expiration times (15 minutes)
- Device certificates for kiosk authentication
- IP whitelisting for admin access
- Strong password policies with complexity requirements

### Tampering
**Threats:**
- Visitor data being modified without authorization
- Audit logs being altered to hide malicious activity
- Kiosk software being modified to capture additional data

**Mitigations:**
- Immutable audit logs with cryptographic hashing
- Role-based access control (RBAC) with principle of least privilege
- Code signing for kiosk applications
- Database integrity constraints and triggers
- Field-level encryption for sensitive data

### Repudiation
**Threats:**
- Users denying actions they performed
- Lack of accountability for data access
- Insufficient logging of PII access

**Mitigations:**
- Comprehensive audit logging of all PII access
- Digital signatures for critical operations
- Non-repudiation through cryptographic proofs
- Timestamped logs with NTP synchronization
- User session tracking and correlation

### Information Disclosure
**Threats:**
- Unauthorized access to visitor PII
- Data breaches exposing sensitive information
- Insider threats accessing data beyond their role
- Data leakage through logs or error messages

**Mitigations:**
- Field-level encryption using AWS KMS
- TLS 1.3 for all data in transit
- Role-based data access controls
- Data masking in logs and error messages
- Regular security assessments and penetration testing

### Denial of Service
**Threats:**
- API endpoints being overwhelmed with requests
- Database being locked by malicious queries
- Kiosk devices being rendered inoperable

**Mitigations:**
- Rate limiting on all API endpoints
- DDoS protection through CloudFlare
- Database connection pooling and query optimization
- Circuit breakers for external service calls
- Graceful degradation and offline mode for kiosks

### Elevation of Privilege
**Threats:**
- Users gaining access to higher privilege levels
- SQL injection leading to database admin access
- Cross-site scripting (XSS) attacks
- Privilege escalation through application vulnerabilities

**Mitigations:**
- Strict RBAC implementation with regular reviews
- Parameterized queries and ORM usage
- Content Security Policy (CSP) headers
- Input validation and sanitization
- Regular security updates and vulnerability scanning

## Data Classification

### Highly Sensitive Data
- **Visitor Email Addresses**: Encrypted at rest, masked in logs
- **Visitor Phone Numbers**: Encrypted at rest, masked in logs
- **Visitor Photos**: Encrypted at rest, access logged
- **Digital Signatures**: Encrypted at rest, access logged

### Sensitive Data
- **Visitor Names**: Stored in plaintext, access logged
- **Company Information**: Stored in plaintext, access logged
- **Visit Details**: Stored in plaintext, access logged
- **Host Information**: Stored in plaintext, access logged

### Internal Data
- **Audit Logs**: Stored in plaintext, retention policies applied
- **System Logs**: Stored in plaintext, automated cleanup
- **Configuration Data**: Stored in plaintext, version controlled

## Encryption Implementation

### Field-Level Encryption
```typescript
// Example of encrypted visitor model
interface EncryptedVisitor {
  id: string;
  firstName: string; // Plaintext
  lastName: string;  // Plaintext
  company: string;   // Plaintext
  
  // Encrypted fields
  encryptedEmail: EncryptedData;
  encryptedPhone: EncryptedData;
  
  // Searchable hashes
  emailHash: string;
  phoneHash: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### Encryption Process
1. **Key Generation**: AWS KMS generates a unique Data Encryption Key (DEK) for each field
2. **Data Encryption**: AES-256-GCM encrypts the plaintext using the DEK
3. **Key Encryption**: KMS encrypts the DEK using the Customer Master Key (CMK)
4. **Storage**: Encrypted data and encrypted DEK are stored separately

### Key Management
- **Customer Master Key (CMK)**: Managed by AWS KMS with automatic rotation
- **Data Encryption Keys (DEK)**: Generated per field, never stored in plaintext
- **Key Access**: Controlled through IAM policies and VPC endpoints
- **Key Rotation**: Automatic annual rotation with backward compatibility

## Role-Based Access Control (RBAC)

### Role Definitions

#### ADMIN
**Permissions:**
- Full access to all organizational data
- Can view, create, update, and delete all resources
- Access to PII data with full audit logging
- Can manage users and permissions
- Can configure GDPR settings and data retention
- Can export and delete data for compliance

**Data Scope:** Organization-wide with PII access

#### RECEPTIONIST
**Permissions:**
- Can view and manage visitors and visits
- Access to PII data for operational purposes
- Can check visitors in and out
- Can create and update visitor records
- Cannot delete historical data
- Cannot access system administration features

**Data Scope:** Organization-wide with PII access

#### SECURITY
**Permissions:**
- Read-only access to visitor and visit data
- Can check visitors in and out
- Can view current visitor status
- Cannot access historical PII data
- Cannot modify visitor records
- Can access security-related reports

**Data Scope:** Organization-wide without PII access

#### MANAGER
**Permissions:**
- Read-only access to aggregated data
- Can view reports and analytics
- Can export non-PII data for business purposes
- Cannot access individual PII records
- Cannot modify any data
- Can view audit logs for their organization

**Data Scope:** Organization-wide without PII access

### Permission Matrix

| Resource | ADMIN | RECEPTIONIST | SECURITY | MANAGER |
|----------|-------|--------------|----------|---------|
| Visitor PII | R/W/D | R/W | - | - |
| Visitor Data | R/W/D | R/W | R | R |
| Visit Data | R/W/D | R/W | R/W | R |
| Employee Data | R/W/D | R | R | R |
| Reports | R/W/E | R | R | R/E |
| Audit Logs | R/E | - | R | R |
| System Config | R/W | - | - | - |
| GDPR Requests | R/W | - | - | - |

*Legend: R=Read, W=Write, D=Delete, E=Export*

## Audit Logging

### PII Access Logging
Every access to PII data is logged with the following information:
- **User ID**: Who accessed the data
- **Resource Type**: What type of data was accessed
- **Resource ID**: Specific record accessed
- **Action**: Type of access (VIEW, CREATE, UPDATE, DELETE, EXPORT)
- **PII Fields**: Which specific PII fields were accessed
- **Timestamp**: When the access occurred
- **IP Address**: Where the access originated
- **User Agent**: Browser/application used
- **Purpose**: Business justification for access
- **Legal Basis**: GDPR legal basis for processing

### Audit Log Retention
- **PII Access Logs**: Retained for 7 years for compliance
- **System Logs**: Retained for 1 year
- **Security Logs**: Retained for 3 years
- **GDPR Request Logs**: Retained permanently

### Log Integrity
- All audit logs are cryptographically signed
- Logs are stored in append-only format
- Regular integrity checks verify log completeness
- Logs are replicated across multiple regions

## Data Retention and Purging

### Retention Policies

#### Visitor Data
- **Active Visitors**: Retained while they have future visits
- **Inactive Visitors**: Retained for 3 years after last visit
- **Deleted Visitors**: Tombstone records retained for 7 years

#### Visit Data
- **Recent Visits**: Retained for 2 years for operational purposes
- **Historical Visits**: Archived after 2 years, retained for 7 years
- **Cancelled Visits**: Retained for 1 year

#### Audit Data
- **PII Access Logs**: Retained for 7 years
- **System Audit Logs**: Retained for 3 years
- **Security Incident Logs**: Retained for 10 years

### Automated Purging
- Daily cleanup jobs remove expired data
- Soft deletion with tombstone records for compliance
- Secure deletion of encrypted data keys
- File storage cleanup for photos and signatures

## GDPR Compliance

### Data Subject Rights

#### Right to Access (Article 15)
- Visitors can request all data held about them
- Automated export process generates comprehensive report
- Includes all visits, photos, signatures, and audit logs
- Response provided within 30 days

#### Right to Rectification (Article 16)
- Visitors can request correction of inaccurate data
- Self-service portal for basic information updates
- Admin approval required for significant changes
- All changes are audit logged

#### Right to Erasure (Article 17)
- Visitors can request deletion of their data
- Automated deletion process with verification
- Tombstone records maintained for compliance
- Secure deletion of encryption keys

#### Right to Data Portability (Article 20)
- Data export in structured, machine-readable format
- JSON format with schema documentation
- Includes all personal data and metadata
- Secure download link with expiration

### Legal Basis for Processing
- **Legitimate Interest**: Visitor management and security
- **Consent**: Marketing communications (opt-in)
- **Legal Obligation**: Audit logs and compliance records
- **Vital Interests**: Emergency contact information

### Data Processing Records
- Comprehensive record of all processing activities
- Regular updates to reflect system changes
- Annual review and validation process
- Available for regulatory inspection

## Security Controls

### Network Security
- **TLS 1.3**: All data in transit encrypted
- **HSTS**: HTTP Strict Transport Security enabled
- **Certificate Pinning**: Mobile apps pin certificates
- **VPC**: Database isolated in private subnets
- **WAF**: Web Application Firewall protects APIs

### Application Security
- **CSRF Protection**: Cross-Site Request Forgery tokens
- **XSS Prevention**: Content Security Policy headers
- **SQL Injection**: Parameterized queries and ORM
- **Input Validation**: Server-side validation for all inputs
- **Output Encoding**: HTML encoding for user-generated content

### Authentication & Authorization
- **JWT Tokens**: Short-lived access tokens (15 minutes)
- **Refresh Tokens**: Longer-lived tokens (7 days) with rotation
- **Password Policy**: Minimum 8 characters, complexity requirements
- **Account Lockout**: 5 failed attempts locks account for 15 minutes
- **Session Management**: Secure session handling with timeout

### Infrastructure Security
- **Container Security**: Regular image scanning and updates
- **Secrets Management**: AWS Secrets Manager for sensitive data
- **IAM Policies**: Principle of least privilege
- **Network Segmentation**: Isolated environments for different tiers
- **Monitoring**: Real-time security monitoring and alerting

## Incident Response

### Security Incident Classification
- **P0 - Critical**: Data breach, system compromise
- **P1 - High**: Unauthorized access, service disruption
- **P2 - Medium**: Security policy violation, suspicious activity
- **P3 - Low**: Minor security issues, policy updates

### Response Procedures
1. **Detection**: Automated monitoring and manual reporting
2. **Assessment**: Determine scope and impact
3. **Containment**: Isolate affected systems
4. **Investigation**: Forensic analysis and root cause
5. **Recovery**: Restore services and implement fixes
6. **Lessons Learned**: Update procedures and controls

### Breach Notification
- **Internal**: Immediate notification to security team
- **Regulatory**: 72-hour notification to supervisory authority
- **Data Subjects**: Notification within 72 hours if high risk
- **Documentation**: Comprehensive incident documentation

## Compliance Monitoring

### Regular Assessments
- **Quarterly**: Internal security reviews
- **Annually**: Third-party security audit
- **Continuously**: Automated compliance monitoring
- **Ad-hoc**: Incident-driven assessments

### Metrics and KPIs
- **PII Access**: Number of PII access events per user/day
- **Failed Logins**: Failed authentication attempts
- **Data Retention**: Compliance with retention policies
- **GDPR Requests**: Response time and completion rate
- **Security Incidents**: Number and severity of incidents

### Reporting
- **Monthly**: Security metrics dashboard
- **Quarterly**: Compliance status report
- **Annually**: Comprehensive security assessment
- **Real-time**: Security incident alerts

## Training and Awareness

### Employee Training
- **Onboarding**: Security awareness for all new employees
- **Annual**: Mandatory security training refresh
- **Role-specific**: Additional training for privileged users
- **Incident-based**: Training following security incidents

### Topics Covered
- Data protection principles and GDPR requirements
- Password security and multi-factor authentication
- Phishing and social engineering awareness
- Incident reporting procedures
- Privacy by design principles

## Continuous Improvement

### Security Reviews
- Regular review of security controls and procedures
- Updates based on threat landscape changes
- Integration of new security technologies
- Feedback from security assessments and audits

### Technology Updates
- Regular updates to security libraries and frameworks
- Monitoring of security advisories and CVEs
- Proactive patching and vulnerability management
- Evaluation of new security tools and services

---

## Data Processing Agreement (DPA) Template

### Parties
- **Data Controller**: [Organization Name]
- **Data Processor**: VMS Platform Provider
- **Effective Date**: [Date]
- **Term**: Duration of service agreement

### Scope of Processing
- **Subject Matter**: Visitor management services
- **Duration**: As specified in service agreement
- **Nature and Purpose**: Processing visitor information for access control and security
- **Categories of Data**: Names, contact information, photos, visit records
- **Categories of Data Subjects**: Visitors, employees, contractors

### Data Processor Obligations
1. Process personal data only on documented instructions
2. Ensure confidentiality of processing personnel
3. Implement appropriate technical and organizational measures
4. Assist with data subject rights requests
5. Notify of personal data breaches within 24 hours
6. Delete or return personal data at end of processing
7. Make available information necessary to demonstrate compliance

### Technical and Organizational Measures
- Encryption of personal data at rest and in transit
- Regular testing and evaluation of security measures
- Access controls and authentication mechanisms
- Incident response and breach notification procedures
- Staff training and confidentiality agreements

### Sub-processing
- List of authorized sub-processors provided separately
- Prior written consent required for new sub-processors
- Same data protection obligations imposed on sub-processors
- Data processor remains fully liable for sub-processor compliance

### Data Subject Rights
- Assistance with access requests within 10 business days
- Support for rectification and erasure requests
- Data portability assistance when technically feasible
- Objection and restriction request handling

### Data Transfers
- Transfers outside EEA only with appropriate safeguards
- Standard Contractual Clauses or adequacy decisions
- Additional measures for transfers to third countries
- Regular review of transfer mechanisms

### Liability and Indemnification
- Data processor liable for damages caused by non-compliance
- Indemnification for regulatory fines and penalties
- Insurance coverage for data protection liabilities
- Limitation of liability as specified in service agreement

### Audit Rights
- Annual compliance audits by independent third parties
- Right to conduct additional audits with reasonable notice
- Access to audit reports and compliance documentation
- Remediation of identified non-compliance issues

This DPA template should be customized based on specific organizational requirements and legal jurisdiction.