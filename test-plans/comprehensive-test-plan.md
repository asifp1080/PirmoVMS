# VMS Test Plans

## Overview

This document outlines comprehensive test scenarios and acceptance criteria for the Visitor Management System (VMS). The test plans cover API endpoints, web application functionality, and Android kiosk app behavior.

## API Testing

### Authentication & Authorization

#### Test Scenario: User Login
**Acceptance Criteria:**
- ✅ Valid credentials return JWT tokens and user info
- ✅ Invalid credentials return 401 Unauthorized
- ✅ Missing organization returns 400 Bad Request
- ✅ Rate limiting prevents brute force attacks (max 5 attempts per minute)
- ✅ Tokens expire after configured time (15 minutes for access, 7 days for refresh)

#### Test Scenario: Role-Based Access Control (RBAC)
**Acceptance Criteria:**
- ✅ ADMIN can access all endpoints within their organization
- ✅ RECEPTIONIST can create/update visits but not delete
- ✅ SECURITY can view visits but not modify
- ✅ MANAGER can view reports and analytics
- ✅ Cross-organization access is blocked (403 Forbidden)

#### Test Scenario: Organization Scoping
**Acceptance Criteria:**
- ✅ Users can only access data from their organization
- ✅ API endpoints validate org_id in request path
- ✅ Database queries include org_id filter
- ✅ Audit logs record organization context

### Visit Management

#### Test Scenario: Visit Lifecycle
**Acceptance Criteria:**
- ✅ Pre-registration creates PENDING visit with QR code
- ✅ Check-in updates status to CHECKED_IN with timestamp and badge number
- ✅ Check-out updates status to CHECKED_OUT with duration calculation
- ✅ No-show visits can be marked appropriately
- ✅ Visit conflicts are detected and prevented

#### Test Scenario: Visit Filtering & Pagination
**Acceptance Criteria:**
- ✅ Filter by status (PENDING, CHECKED_IN, CHECKED_OUT, NO_SHOW)
- ✅ Filter by purpose (MEETING, INTERVIEW, DELIVERY, GUEST, OTHER)
- ✅ Filter by date range (from_date, to_date)
- ✅ Filter by location and host
- ✅ Cursor-based pagination with configurable limit (max 100)
- ✅ Results sorted by most recent first

#### Test Scenario: Visit Validation
**Acceptance Criteria:**
- ✅ Required fields validation (visitor_id, location_id, host_id, purpose)
- ✅ Business hours validation (configurable per location)
- ✅ Scheduling conflict detection (same visitor, overlapping times)
- ✅ Host availability validation
- ✅ Location capacity limits

### Webhook System

#### Test Scenario: Webhook Management
**Acceptance Criteria:**
- ✅ Create webhook subscription with URL and event filters
- ✅ Update webhook configuration (events, active status)
- ✅ Delete webhook subscription
- ✅ List all webhooks for organization
- ✅ Webhook URL validation (HTTPS required in production)

#### Test Scenario: Webhook Delivery
**Acceptance Criteria:**
- ✅ Events trigger webhook calls (VISIT.CREATED, VISIT.CHECKED_IN, VISIT.CHECKED_OUT)
- ✅ Webhook payload includes event data and metadata
- ✅ HMAC signature verification (X-VMS-Signature header)
- ✅ Retry logic with exponential backoff (max 3 retries)
- ✅ Failed deliveries are logged and can be replayed

#### Test Scenario: Webhook Security
**Acceptance Criteria:**
- ✅ Webhook URLs must be HTTPS in production
- ✅ Internal network URLs are blocked
- ✅ Rate limiting per organization (max 10 webhooks)
- ✅ Replay protection via nonce
- ✅ Webhook secrets are securely generated and stored

### Audit Logging

#### Test Scenario: Audit Trail
**Acceptance Criteria:**
- ✅ All mutating operations create audit logs
- ✅ Audit logs include old and new values
- ✅ User context (IP address, user agent) is captured
- ✅ Audit logs are immutable (no updates/deletes)
- ✅ Audit logs support compliance reporting

### Notification System

#### Test Scenario: Notification Queuing
**Acceptance Criteria:**
- ✅ Notifications are queued for async processing
- ✅ Failed notifications are retried with backoff
- ✅ Fallback chain is followed (SMS → Email → Slack)
- ✅ Rate limiting prevents spam (max per visitor/visit)
- ✅ Template rendering works with dynamic data

## Web Application Testing

### Dashboard

#### Test Scenario: Dashboard Overview
**Acceptance Criteria:**
- ✅ Displays current visitor count and today's arrivals
- ✅ Shows real-time "Currently In Building" list
- ✅ Renders trend charts (weekly visits, hourly distribution)
- ✅ Quick action buttons (Register Visitor, Print Badge)
- ✅ Online/offline status indicator

#### Test Scenario: Dashboard Performance
**Acceptance Criteria:**
- ✅ Loads within 2 seconds on initial visit
- ✅ Real-time updates without full page refresh
- ✅ Graceful handling of API errors
- ✅ Skeleton loaders during data fetching
- ✅ Responsive design on tablet and desktop

### Visitor Management

#### Test Scenario: Visitor CRUD Operations
**Acceptance Criteria:**
- ✅ Create new visitor with form validation
- ✅ Edit existing visitor information
- ✅ Delete visitor with confirmation dialog
- ✅ Search visitors by name, email, or company
- ✅ Filter visitors by company and date range

#### Test Scenario: Visitor Data Table
**Acceptance Criteria:**
- ✅ Sortable columns (name, company, last visit)
- ✅ Pagination with configurable page size
- ✅ Export functionality (CSV, PDF)
- ✅ Bulk operations (select multiple visitors)
- ✅ Empty state when no visitors found

#### Test Scenario: Form Validation
**Acceptance Criteria:**
- ✅ Required field validation (first name, last name, email)
- ✅ Email format validation
- ✅ Phone number format validation
- ✅ Real-time validation feedback
- ✅ Form submission disabled until valid

### Visit Management

#### Test Scenario: Visit Scheduling
**Acceptance Criteria:**
- ✅ Pre-register visits with date/time picker
- ✅ Host selection with search functionality
- ✅ Purpose selection with custom options
- ✅ Conflict detection and warnings
- ✅ QR code generation for quick check-in

#### Test Scenario: Visit Tracking
**Acceptance Criteria:**
- ✅ Real-time visit status updates
- ✅ Check-in/check-out actions from admin panel
- ✅ Visit history with filtering options
- ✅ Duration calculation and display
- ✅ Badge number assignment and tracking

### Settings & Configuration

#### Test Scenario: Organization Settings
**Acceptance Criteria:**
- ✅ Update organization profile information
- ✅ Configure business hours and holidays
- ✅ Set visitor policies and requirements
- ✅ Manage notification preferences
- ✅ Configure kiosk themes and languages

#### Test Scenario: User Management
**Acceptance Criteria:**
- ✅ Invite new users with role assignment
- ✅ Update user roles and permissions
- ✅ Deactivate/reactivate user accounts
- ✅ Password reset functionality
- ✅ Activity logging for user actions

## Android Kiosk Testing

### Attract Screen

#### Test Scenario: Initial Display
**Acceptance Criteria:**
- ✅ Displays welcome message and company branding
- ✅ Shows Check In and Check Out buttons prominently
- ✅ Animated "Touch to start" indicator
- ✅ Online/offline status indicator
- ✅ Auto-return to attract screen after inactivity (30 seconds)

#### Test Scenario: Kiosk Mode
**Acceptance Criteria:**
- ✅ Prevents access to Android system UI
- ✅ Disables back button and home button
- ✅ Maintains full-screen mode
- ✅ Prevents app switching
- ✅ Automatic restart on app crash

### Check-In Flow

#### Test Scenario: Multi-Step Process
**Acceptance Criteria:**
- ✅ Language selection (English, Spanish, French, German, Chinese)
- ✅ Visit purpose selection with icons
- ✅ Visitor details form with validation
- ✅ Host selection with search
- ✅ Photo capture with retake option
- ✅ Agreement signing (if required)
- ✅ Review and confirmation screen

#### Test Scenario: Form Validation
**Acceptance Criteria:**
- ✅ Required fields highlighted when empty
- ✅ Email format validation
- ✅ Phone number format validation
- ✅ Next button disabled until valid
- ✅ Clear error messages in selected language

#### Test Scenario: Camera Integration
**Acceptance Criteria:**
- ✅ Camera permission request on first use
- ✅ Photo preview with retake option
- ✅ Image compression for upload
- ✅ Fallback when camera unavailable
- ✅ Photo storage in secure location

### Check-Out Flow

#### Test Scenario: Visitor Identification
**Acceptance Criteria:**
- ✅ Search by badge number
- ✅ Search by phone number
- ✅ Search by last name
- ✅ QR code scanning (if available)
- ✅ Multiple match handling

#### Test Scenario: Check-Out Process
**Acceptance Criteria:**
- ✅ Display visitor information for confirmation
- ✅ Calculate and display visit duration
- ✅ Optional feedback collection
- ✅ Thank you message with visit summary
- ✅ Host notification of check-out

### Offline Mode

#### Test Scenario: Network Disconnection
**Acceptance Criteria:**
- ✅ Detect network connectivity loss
- ✅ Display offline mode indicator
- ✅ Queue visits locally with SQLite
- ✅ Store photos and signatures locally
- ✅ Continue accepting new check-ins

#### Test Scenario: Data Synchronization
**Acceptance Criteria:**
- ✅ Automatic sync when network restored
- ✅ Conflict resolution (client timestamp wins)
- ✅ Progress indicator during sync
- ✅ Error handling for failed syncs
- ✅ Retry mechanism with exponential backoff

#### Test Scenario: Storage Management
**Acceptance Criteria:**
- ✅ Monitor local storage usage
- ✅ Cleanup old synced data
- ✅ Handle storage full scenarios
- ✅ Compress images to save space
- ✅ Priority queue for critical data

### Device Management

#### Test Scenario: Kiosk Configuration
**Acceptance Criteria:**
- ✅ QR code setup for initial configuration
- ✅ Pull configuration from server
- ✅ Apply branding (logo, colors, background)
- ✅ Language pack downloads
- ✅ Heartbeat to server every 5 minutes

#### Test Scenario: Hardware Integration
**Acceptance Criteria:**
- ✅ Badge printer integration (if available)
- ✅ Barcode/QR scanner integration
- ✅ External camera support
- ✅ Network status monitoring
- ✅ Battery level monitoring (for tablets)

## Performance Testing

### Load Testing Scenarios

#### Test Scenario: Concurrent Users
**Acceptance Criteria:**
- ✅ Support 100 concurrent web users
- ✅ Support 50 concurrent kiosk check-ins
- ✅ Response time under 500ms for API calls
- ✅ Database connection pooling
- ✅ Redis caching for frequent queries

#### Test Scenario: Data Volume
**Acceptance Criteria:**
- ✅ Handle 10,000+ visitors per organization
- ✅ Handle 100,000+ historical visits
- ✅ Efficient pagination for large datasets
- ✅ Database indexing for performance
- ✅ Archive old data automatically

### Stress Testing

#### Test Scenario: Peak Load
**Acceptance Criteria:**
- ✅ Handle 5x normal load during peak hours
- ✅ Graceful degradation under extreme load
- ✅ Circuit breaker for external services
- ✅ Rate limiting to prevent abuse
- ✅ Auto-scaling in cloud environments

## Security Testing

### Authentication Security

#### Test Scenario: Token Security
**Acceptance Criteria:**
- ✅ JWT tokens are properly signed and verified
- ✅ Refresh tokens are securely stored
- ✅ Token blacklisting on logout
- ✅ Automatic token rotation
- ✅ Secure token transmission (HTTPS only)

### Data Protection

#### Test Scenario: PII Handling
**Acceptance Criteria:**
- ✅ Visitor photos are encrypted at rest
- ✅ Email addresses are masked in logs
- ✅ GDPR compliance for data deletion
- ✅ Data retention policies enforced
- ✅ Secure file upload validation

### Network Security

#### Test Scenario: API Security
**Acceptance Criteria:**
- ✅ HTTPS enforced for all endpoints
- ✅ CORS properly configured
- ✅ SQL injection prevention
- ✅ XSS protection headers
- ✅ Input validation and sanitization

## Accessibility Testing

### Web Accessibility

#### Test Scenario: WCAG Compliance
**Acceptance Criteria:**
- ✅ Keyboard navigation support
- ✅ Screen reader compatibility
- ✅ Color contrast ratios meet AA standards
- ✅ Alt text for all images
- ✅ Focus indicators visible

### Kiosk Accessibility

#### Test Scenario: Physical Accessibility
**Acceptance Criteria:**
- ✅ Large touch targets (minimum 44px)
- ✅ High contrast mode option
- ✅ Text size adjustment
- ✅ Voice prompts (future feature)
- ✅ Wheelchair accessible height

## Browser & Device Compatibility

### Web Browser Support

#### Test Scenario: Cross-Browser Testing
**Acceptance Criteria:**
- ✅ Chrome (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Edge (latest 2 versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Android Device Support

#### Test Scenario: Device Compatibility
**Acceptance Criteria:**
- ✅ Android 8.0+ (API level 26+)
- ✅ Tablet form factors (7-12 inches)
- ✅ Various screen resolutions
- ✅ Different hardware configurations
- ✅ Manufacturer-specific Android variants

## Monitoring & Observability

### Application Monitoring

#### Test Scenario: Health Checks
**Acceptance Criteria:**
- ✅ API health endpoint responds within 1 second
- ✅ Database connectivity check
- ✅ Redis connectivity check
- ✅ External service dependency checks
- ✅ Disk space and memory monitoring

### Error Tracking

#### Test Scenario: Error Handling
**Acceptance Criteria:**
- ✅ Unhandled exceptions are logged
- ✅ Error rates are monitored and alerted
- ✅ Stack traces include relevant context
- ✅ User-friendly error messages
- ✅ Automatic error recovery where possible

## Backup & Recovery

### Data Backup

#### Test Scenario: Backup Procedures
**Acceptance Criteria:**
- ✅ Daily automated database backups
- ✅ File storage backups (photos, signatures)
- ✅ Configuration backups
- ✅ Backup integrity verification
- ✅ Cross-region backup replication

### Disaster Recovery

#### Test Scenario: Recovery Procedures
**Acceptance Criteria:**
- ✅ Database restore from backup (RTO < 4 hours)
- ✅ Application deployment automation
- ✅ DNS failover configuration
- ✅ Data consistency verification
- ✅ Recovery testing quarterly

---

## Test Execution Guidelines

### Test Environment Setup
1. Use dedicated test databases for each test suite
2. Mock external services (email, SMS, webhooks)
3. Use test data that covers edge cases
4. Clean up test data after each test run

### Continuous Integration
1. Run unit tests on every commit
2. Run integration tests on pull requests
3. Run E2E tests on staging deployments
4. Performance tests on release candidates

### Test Data Management
1. Use factories for consistent test data
2. Include multi-language test scenarios
3. Test with realistic data volumes
4. Cover edge cases and error conditions

### Reporting
1. Generate test coverage reports
2. Track test execution metrics
3. Document known issues and workarounds
4. Maintain test result history