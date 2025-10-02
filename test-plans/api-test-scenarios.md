# API Test Scenarios

## Authentication & Authorization Tests

### Login Flow Tests

#### Scenario: Successful Login
```
GIVEN a valid user account exists
WHEN the user submits correct credentials
THEN they receive access and refresh tokens
AND user profile information is returned
AND tokens have appropriate expiration times
```

#### Scenario: Invalid Credentials
```
GIVEN a user account exists
WHEN the user submits incorrect password
THEN they receive 401 Unauthorized
AND no tokens are issued
AND error message is generic for security
```

#### Scenario: Rate Limiting
```
GIVEN a user makes multiple failed login attempts
WHEN they exceed 5 attempts in 1 minute
THEN subsequent attempts are blocked with 429 Too Many Requests
AND they must wait before trying again
```

### RBAC Tests

#### Scenario: Admin Access
```
GIVEN a user with ADMIN role
WHEN they access any endpoint in their organization
THEN they have full read/write access
AND can perform all CRUD operations
```

#### Scenario: Receptionist Restrictions
```
GIVEN a user with RECEPTIONIST role
WHEN they try to delete a visit
THEN they receive 403 Forbidden
BUT they can create and update visits
```

#### Scenario: Cross-Organization Access
```
GIVEN a user from Organization A
WHEN they try to access Organization B's data
THEN they receive 403 Forbidden
AND no data is leaked
```

## Visit Management Tests

### Visit Creation Tests

#### Scenario: Pre-Registration
```
GIVEN valid visitor and host information
WHEN a visit is pre-registered
THEN a PENDING visit is created
AND a QR code is generated
AND the host is notified (if configured)
```

#### Scenario: Scheduling Conflict
```
GIVEN a visitor has an existing visit at 2:00 PM
WHEN they try to schedule another visit at 2:30 PM
THEN they receive 409 Conflict
AND the conflicting visit details are provided
```

#### Scenario: Business Hours Validation
```
GIVEN a location with business hours 9 AM - 5 PM
WHEN a visit is scheduled for 7 AM
THEN they receive 400 Bad Request
AND an appropriate error message
```

### Check-In/Check-Out Tests

#### Scenario: Successful Check-In
```
GIVEN a PENDING visit exists
WHEN the visitor checks in with photo and signature
THEN the visit status becomes CHECKED_IN
AND a badge number is assigned
AND check-in timestamp is recorded
AND the host is notified
```

#### Scenario: Check-Out Process
```
GIVEN a visitor is CHECKED_IN
WHEN they check out
THEN the visit status becomes CHECKED_OUT
AND check-out timestamp is recorded
AND visit duration is calculated
AND the host is notified
```

#### Scenario: Late Check-In
```
GIVEN a visit scheduled for 2:00 PM
WHEN the visitor checks in at 2:45 PM
THEN the check-in is accepted
AND the actual check-in time is recorded
AND the delay is noted in metadata
```

### Filtering & Search Tests

#### Scenario: Status Filter
```
GIVEN visits with various statuses exist
WHEN filtering by status=CHECKED_IN
THEN only CHECKED_IN visits are returned
AND pagination metadata is correct
```

#### Scenario: Date Range Filter
```
GIVEN visits spanning multiple months
WHEN filtering by from_date=2024-01-01 and to_date=2024-01-31
THEN only January 2024 visits are returned
AND results are sorted by most recent first
```

#### Scenario: Complex Filter Combination
```
GIVEN various visits exist
WHEN filtering by status=CHECKED_OUT AND purpose=MEETING AND location_id=123
THEN only visits matching all criteria are returned
AND the result count is accurate
```

## Webhook Tests

### Webhook Management Tests

#### Scenario: Create Webhook
```
GIVEN valid webhook configuration
WHEN creating a webhook subscription
THEN a webhook record is created
AND a secret is generated
AND the webhook is marked as active
```

#### Scenario: Invalid Webhook URL
```
GIVEN a webhook with HTTP URL in production
WHEN creating the webhook
THEN they receive 400 Bad Request
AND HTTPS requirement is explained
```

#### Scenario: Webhook Limit
```
GIVEN an organization already has 10 webhooks
WHEN they try to create an 11th webhook
THEN they receive 400 Bad Request
AND the limit is explained
```

### Webhook Delivery Tests

#### Scenario: Successful Delivery
```
GIVEN a webhook subscription for VISIT.CREATED
WHEN a visit is created
THEN a webhook is sent to the configured URL
AND includes proper HMAC signature
AND contains the visit data
```

#### Scenario: Failed Delivery with Retry
```
GIVEN a webhook endpoint returns 500 error
WHEN a webhook is triggered
THEN it retries with exponential backoff
AND logs the failure
AND eventually gives up after max retries
```

#### Scenario: Webhook Security
```
GIVEN a webhook payload
WHEN it's sent to the endpoint
THEN it includes X-VMS-Signature header
AND the signature can be verified with the secret
AND includes a nonce for replay protection
```

## Audit Logging Tests

### Audit Trail Tests

#### Scenario: Visit Creation Audit
```
GIVEN a user creates a visit
WHEN the operation completes
THEN an audit log is created
AND includes the user ID and IP address
AND captures the new visit data
```

#### Scenario: Visit Update Audit
```
GIVEN a user updates a visit status
WHEN the operation completes
THEN an audit log is created
AND includes both old and new values
AND records the change timestamp
```

#### Scenario: Audit Log Immutability
```
GIVEN audit logs exist
WHEN attempting to modify them
THEN the operation is rejected
AND audit logs remain unchanged
```

## Notification Tests

### Notification Queuing Tests

#### Scenario: Host Alert Notification
```
GIVEN a visitor checks in
WHEN the check-in completes
THEN a notification is queued for the host
AND uses the appropriate template
AND includes visit details
```

#### Scenario: Notification Fallback
```
GIVEN SMS notification fails
WHEN the fallback chain is triggered
THEN email notification is attempted
AND if that fails, Slack notification is tried
```

#### Scenario: Rate Limiting
```
GIVEN a visitor has already received 3 notifications today
WHEN another notification is triggered
THEN it's blocked by rate limiting
AND the limit is logged
```

## Error Handling Tests

### Validation Tests

#### Scenario: Missing Required Fields
```
GIVEN a visit creation request without visitor_id
WHEN the request is processed
THEN they receive 400 Bad Request
AND specific field errors are returned
```

#### Scenario: Invalid Data Types
```
GIVEN a request with string where number expected
WHEN the request is processed
THEN they receive 400 Bad Request
AND type validation error is returned
```

### Database Error Tests

#### Scenario: Database Connection Loss
```
GIVEN the database becomes unavailable
WHEN an API request is made
THEN they receive 503 Service Unavailable
AND the error is logged
AND connection retry is attempted
```

#### Scenario: Constraint Violation
```
GIVEN a request that would violate database constraints
WHEN the request is processed
THEN they receive 409 Conflict
AND the constraint violation is explained
```

## Performance Tests

### Load Tests

#### Scenario: Concurrent Visit Creation
```
GIVEN 50 concurrent visit creation requests
WHEN they are processed simultaneously
THEN all requests complete within 2 seconds
AND no data corruption occurs
AND database connections are properly managed
```

#### Scenario: Large Dataset Pagination
```
GIVEN 10,000 visits in the database
WHEN requesting paginated results
THEN each page loads within 500ms
AND pagination cursors work correctly
AND memory usage remains stable
```

### Stress Tests

#### Scenario: Memory Pressure
```
GIVEN high memory usage conditions
WHEN processing requests
THEN the application remains responsive
AND garbage collection is effective
AND no memory leaks occur
```

---

## Test Data Requirements

### Organizations
- Multi-tenant setup with 3+ organizations
- Different time zones and business hours
- Various subscription tiers and features

### Users
- All role types (ADMIN, RECEPTIONIST, SECURITY, MANAGER)
- Active and inactive users
- Users with different permissions

### Visitors
- Multi-language preferences
- Various companies and contact methods
- Visitors with and without photos

### Visits
- All status types and purposes
- Historical data spanning multiple months
- Edge cases (very short/long visits, conflicts)

### Locations
- Multiple locations per organization
- Different capacities and configurations
- Various kiosk settings and themes

## Test Environment Setup

### Database
- Isolated test database per test suite
- Automatic cleanup between tests
- Realistic data volumes for performance tests

### External Services
- Mock email/SMS providers
- Mock webhook endpoints
- Simulated network failures

### Authentication
- Test JWT tokens with various expiration times
- Mock user sessions
- Test API keys and secrets