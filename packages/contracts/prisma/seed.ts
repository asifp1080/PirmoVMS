#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Configuration
const CONFIG = {
  organizations: 3,
  locationsPerOrg: 2,
  employeesPerOrg: 10,
  visitorsCount: 100,
  visitsCount: 500,
  agreementsPerOrg: 3,
  kiosksPerLocation: 1,
  webhooksPerOrg: 2,
}

// Sample data
const INDUSTRIES = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education']
const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Security']
const JOB_TITLES = ['Manager', 'Director', 'Engineer', 'Analyst', 'Coordinator', 'Specialist', 'Lead']
const COMPANIES = ['Acme Corp', 'TechStart Inc', 'Global Solutions', 'Innovation Labs', 'Future Systems']
const VISIT_PURPOSES = ['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST', 'OTHER'] as const
const VISIT_STATUSES = ['PENDING', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'] as const
const EMPLOYEE_ROLES = ['ADMIN', 'RECEPTIONIST', 'SECURITY', 'MANAGER'] as const

async function clearDatabase() {
  console.log('🧹 Clearing existing data...')
  
  // Delete in reverse dependency order
  await prisma.visitAgreement.deleteMany()
  await prisma.visit.deleteMany()
  await prisma.visitor.deleteMany()
  await prisma.agreement.deleteMany()
  await prisma.kiosk.deleteMany()
  await prisma.webhook.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.pIIAuditLog.deleteMany()
  await prisma.gDPRRequest.deleteMany()
  await prisma.dataRetentionPolicy.deleteMany()
  await prisma.visitorTombstone.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.location.deleteMany()
  await prisma.organization.deleteMany()
  
  console.log('✅ Database cleared')
}

async function createOrganizations() {
  console.log('🏢 Creating organizations...')
  
  const organizations = []
  
  for (let i = 0; i < CONFIG.organizations; i++) {
    const name = faker.company.name()
    const org = await prisma.organization.create({
      data: {
        name,
        slug: faker.helpers.slugify(name).toLowerCase(),
        domain: faker.internet.domainName(),
        logo_url: `https://images.unsplash.com/photo-${faker.number.int({ min: 1560000000000, max: 1640000000000 })}?w=200&q=80`,
        website: faker.internet.url(),
        industry: faker.helpers.arrayElement(INDUSTRIES),
        employee_count: faker.number.int({ min: 50, max: 5000 }),
        time_zone: faker.helpers.arrayElement(['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo']),
        settings: {
          require_host_approval: faker.datatype.boolean(),
          allow_walk_ins: faker.datatype.boolean(),
          visitor_badge_required: true,
          photo_required: faker.datatype.boolean(),
          agreement_required: faker.datatype.boolean(),
        },
        subscription_tier: faker.helpers.arrayElement(['BASIC', 'PROFESSIONAL', 'ENTERPRISE']),
        subscription_status: 'ACTIVE',
      },
    })
    
    organizations.push(org)
  }
  
  console.log(`✅ Created ${organizations.length} organizations`)
  return organizations
}

async function createLocations(organizations: any[]) {
  console.log('📍 Creating locations...')
  
  const locations = []
  
  for (const org of organizations) {
    for (let i = 0; i < CONFIG.locationsPerOrg; i++) {
      const location = await prisma.location.create({
        data: {
          org_id: org.id,
          name: i === 0 ? 'Main Office' : `Branch Office ${i}`,
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state({ abbreviated: true }),
          postal_code: faker.location.zipCode(),
          country: 'US',
          time_zone: org.time_zone,
          phone: faker.phone.number(),
          capacity: faker.number.int({ min: 50, max: 500 }),
          is_active: true,
          settings: {
            kiosk_enabled: true,
            badge_printer_enabled: faker.datatype.boolean(),
            camera_enabled: true,
            languages: ['en', 'es'],
            theme: faker.helpers.arrayElement(['light', 'dark']),
          },
        },
      })
      
      locations.push(location)
    }
  }
  
  console.log(`✅ Created ${locations.length} locations`)
  return locations
}

async function createEmployees(organizations: any[], locations: any[]) {
  console.log('👥 Creating employees...')
  
  const employees = []
  
  for (const org of organizations) {
    const orgLocations = locations.filter(l => l.org_id === org.id)
    
    for (let i = 0; i < CONFIG.employeesPerOrg; i++) {
      const firstName = faker.person.firstName()
      const lastName = faker.person.lastName()
      const role = i === 0 ? 'ADMIN' : faker.helpers.arrayElement(EMPLOYEE_ROLES)
      
      const employee = await prisma.employee.create({
        data: {
          org_id: org.id,
          first_name: firstName,
          last_name: lastName,
          email: faker.internet.email({ firstName, lastName, provider: org.domain }),
          role,
          is_host: faker.datatype.boolean(0.7), // 70% chance of being a host
          department: faker.helpers.arrayElement(DEPARTMENTS),
          job_title: faker.helpers.arrayElement(JOB_TITLES),
          phone: faker.phone.number(),
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}`,
          status: faker.helpers.arrayElement(['ACTIVE', 'INACTIVE'], { weights: [9, 1] }),
          last_login_at: faker.date.recent({ days: 30 }),
          location_id: faker.helpers.arrayElement(orgLocations).id,
        },
      })
      
      employees.push(employee)
    }
  }
  
  console.log(`✅ Created ${employees.length} employees`)
  return employees
}

async function createVisitors() {
  console.log('🚶 Creating visitors...')
  
  const visitors = []
  
  for (let i = 0; i < CONFIG.visitorsCount; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    
    const visitor = await prisma.visitor.create({
      data: {
        first_name: firstName,
        last_name: lastName,
        email: faker.internet.email({ firstName, lastName }),
        phone: faker.phone.number(),
        company: faker.helpers.arrayElement(COMPANIES),
        photo_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}${i}`,
        preferred_language: faker.helpers.arrayElement(['en', 'es', 'fr']),
        marketing_opt_in: faker.datatype.boolean(0.3),
        notes: faker.datatype.boolean(0.2) ? faker.lorem.sentence() : null,
      },
    })
    
    visitors.push(visitor)
  }
  
  console.log(`✅ Created ${visitors.length} visitors`)
  return visitors
}

async function createAgreements(organizations: any[]) {
  console.log('📄 Creating agreements...')
  
  const agreements = []
  
  for (const org of organizations) {
    const agreementTypes = ['NDA', 'SAFETY', 'PRIVACY']
    
    for (let i = 0; i < CONFIG.agreementsPerOrg; i++) {
      const type = agreementTypes[i] || 'CUSTOM'
      
      const agreement = await prisma.agreement.create({
        data: {
          org_id: org.id,
          name: `${type} Agreement`,
          type,
          content: `<h1>${type} Agreement</h1><p>${faker.lorem.paragraphs(3)}</p>`,
          version: '1.0',
          is_required: faker.datatype.boolean(0.7),
          is_active: true,
        },
      })
      
      agreements.push(agreement)
    }
  }
  
  console.log(`✅ Created ${agreements.length} agreements`)
  return agreements
}

async function createKiosks(organizations: any[], locations: any[]) {
  console.log('🖥️ Creating kiosks...')
  
  const kiosks = []
  
  for (const location of locations) {
    for (let i = 0; i < CONFIG.kiosksPerLocation; i++) {
      const kiosk = await prisma.kiosk.create({
        data: {
          org_id: location.org_id,
          location_id: location.id,
          name: `${location.name} Kiosk ${i + 1}`,
          device_id: faker.string.uuid(),
          status: faker.helpers.arrayElement(['ONLINE', 'OFFLINE'], { weights: [8, 2] }),
          version: '1.0.0',
          last_heartbeat: faker.date.recent({ days: 1 }),
          settings: {
            theme: 'light',
            language: 'en',
            auto_checkin: false,
            badge_printer: true,
          },
        },
      })
      
      kiosks.push(kiosk)
    }
  }
  
  console.log(`✅ Created ${kiosks.length} kiosks`)
  return kiosks
}

async function createWebhooks(organizations: any[]) {
  console.log('🔗 Creating webhooks...')
  
  const webhooks = []
  
  for (const org of organizations) {
    for (let i = 0; i < CONFIG.webhooksPerOrg; i++) {
      const webhook = await prisma.webhook.create({
        data: {
          org_id: org.id,
          url: `https://webhook.site/${faker.string.uuid()}`,
          events: faker.helpers.arrayElements([
            'VISIT.CREATED',
            'VISIT.CHECKED_IN',
            'VISIT.CHECKED_OUT',
            'VISITOR.CREATED',
            'VISITOR.UPDATED',
          ], { min: 1, max: 3 }),
          secret: faker.string.alphanumeric(32),
          is_active: faker.datatype.boolean(0.8),
          last_success: faker.datatype.boolean(0.7) ? faker.date.recent({ days: 7 }) : null,
          last_failure: faker.datatype.boolean(0.3) ? faker.date.recent({ days: 7 }) : null,
          failure_count: faker.number.int({ min: 0, max: 5 }),
        },
      })
      
      webhooks.push(webhook)
    }
  }
  
  console.log(`✅ Created ${webhooks.length} webhooks`)
  return webhooks
}

async function createVisits(organizations: any[], locations: any[], employees: any[], visitors: any[], agreements: any[]) {
  console.log('📅 Creating visits...')
  
  const visits = []
  const now = new Date()
  
  for (let i = 0; i < CONFIG.visitsCount; i++) {
    const org = faker.helpers.arrayElement(organizations)
    const orgLocations = locations.filter(l => l.org_id === org.id)
    const orgEmployees = employees.filter(e => e.org_id === org.id && e.is_host)
    const orgAgreements = agreements.filter(a => a.org_id === org.id)
    
    if (orgLocations.length === 0 || orgEmployees.length === 0) continue
    
    const location = faker.helpers.arrayElement(orgLocations)
    const host = faker.helpers.arrayElement(orgEmployees)
    const visitor = faker.helpers.arrayElement(visitors)
    
    // Generate visit date within the last 90 days or future 30 days
    const daysOffset = faker.number.int({ min: -90, max: 30 })
    const hoursOffset = faker.number.int({ min: 8, max: 18 }) // Business hours
    const minutesOffset = faker.number.int({ min: 0, max: 59 })
    
    const scheduledStart = new Date(now)
    scheduledStart.setDate(scheduledStart.getDate() + daysOffset)
    scheduledStart.setHours(hoursOffset, minutesOffset, 0, 0)
    
    const duration = faker.number.int({ min: 30, max: 240 }) // 30 minutes to 4 hours
    const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60 * 1000)
    
    // Determine visit status based on date
    let status = 'PENDING'
    let checkInTime = null
    let checkOutTime = null
    let badgeNumber = null
    let photoUrl = null
    let signatureUrl = null
    
    if (scheduledStart < now) {
      const statusWeights = [
        { value: 'CHECKED_OUT', weight: 0.6 },
        { value: 'NO_SHOW', weight: 0.2 },
        { value: 'CHECKED_IN', weight: 0.15 },
        { value: 'PENDING', weight: 0.05 },
      ]
      
      status = faker.helpers.weightedArrayElement(statusWeights)
      
      if (status === 'CHECKED_IN' || status === 'CHECKED_OUT') {
        checkInTime = new Date(scheduledStart.getTime() + faker.number.int({ min: -15, max: 30 }) * 60 * 1000)
        badgeNumber = `${location.name.substring(0, 2).toUpperCase()}-${scheduledStart.toISOString().slice(0, 10).replace(/-/g, '')}-${String(i).padStart(3, '0')}`
        photoUrl = `https://images.unsplash.com/photo-${faker.number.int({ min: 1500000000000, max: 1640000000000 })}?w=400&q=80`
        
        if (faker.datatype.boolean(0.3)) {
          signatureUrl = `https://example.com/signatures/${faker.string.uuid()}.png`
        }
        
        if (status === 'CHECKED_OUT') {
          const actualDuration = faker.number.int({ min: 15, max: duration + 60 })
          checkOutTime = new Date(checkInTime.getTime() + actualDuration * 60 * 1000)
        }
      }
    }
    
    const visit = await prisma.visit.create({
      data: {
        org_id: org.id,
        location_id: location.id,
        visitor_id: visitor.id,
        host_id: host.id,
        purpose: faker.helpers.arrayElement(VISIT_PURPOSES),
        status,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        badge_number: badgeNumber,
        qr_code: `QR-${org.slug}-${i}-${Date.now()}`,
        photo_url: photoUrl,
        signature_url: signatureUrl,
        notes: faker.datatype.boolean(0.1) ? faker.lorem.sentence() : null,
        metadata: {
          kiosk_id: faker.datatype.boolean(0.8) ? `kiosk-${location.id}-001` : null,
          check_in_method: faker.helpers.arrayElement(['kiosk', 'manual', 'qr_code']),
          language_used: visitor.preferred_language,
        },
        created_by: host.id,
      },
    })
    
    visits.push(visit)
    
    // Create visit agreements for some visits
    if (status === 'CHECKED_IN' || status === 'CHECKED_OUT') {
      const requiredAgreements = orgAgreements.filter(a => a.is_required)
      
      for (const agreement of requiredAgreements) {
        await prisma.visitAgreement.create({
          data: {
            visit_id: visit.id,
            agreement_id: agreement.id,
            signed_at: checkInTime || new Date(),
            signature_url: signatureUrl,
            ip_address: faker.internet.ip(),
          },
        })
      }
    }
    
    if (i % 50 === 0) {
      console.log(`  📊 Created ${i}/${CONFIG.visitsCount} visits...`)
    }
  }
  
  console.log(`✅ Created ${visits.length} visits`)
  return visits
}

async function createAuditLogs(organizations: any[], employees: any[], visits: any[]) {
  console.log('📋 Creating audit logs...')
  
  let auditCount = 0
  
  for (const visit of visits.slice(0, 100)) { // Sample of visits
    const org = organizations.find(o => o.id === visit.org_id)
    const employee = employees.find(e => e.id === visit.created_by)
    
    if (!org || !employee) continue
    
    // Create audit log for visit creation
    await prisma.auditLog.create({
      data: {
        org_id: org.id,
        user_id: employee.id,
        action: 'CREATE',
        resource_type: 'VISIT',
        resource_id: visit.id,
        old_values: null,
        new_values: {
          visitor_id: visit.visitor_id,
          status: 'PENDING',
          purpose: visit.purpose,
        },
        ip_address: faker.internet.ip(),
        user_agent: faker.internet.userAgent(),
        created_at: visit.created_at,
      },
    })
    auditCount++
    
    // Create audit logs for status changes
    if (visit.check_in_time) {
      await prisma.auditLog.create({
        data: {
          org_id: org.id,
          user_id: employee.id,
          action: 'UPDATE',
          resource_type: 'VISIT',
          resource_id: visit.id,
          old_values: { status: 'PENDING' },
          new_values: { status: 'CHECKED_IN', check_in_time: visit.check_in_time },
          ip_address: faker.internet.ip(),
          user_agent: 'VMS-Kiosk/1.0',
          created_at: visit.check_in_time,
        },
      })
      auditCount++
    }
    
    if (visit.check_out_time) {
      await prisma.auditLog.create({
        data: {
          org_id: org.id,
          user_id: employee.id,
          action: 'UPDATE',
          resource_type: 'VISIT',
          resource_id: visit.id,
          old_values: { status: 'CHECKED_IN' },
          new_values: { status: 'CHECKED_OUT', check_out_time: visit.check_out_time },
          ip_address: faker.internet.ip(),
          user_agent: 'VMS-Kiosk/1.0',
          created_at: visit.check_out_time,
        },
      })
      auditCount++
    }
  }
  
  console.log(`✅ Created ${auditCount} audit logs`)
}

async function createSampleNotifications(organizations: any[], employees: any[]) {
  console.log('📧 Creating sample notifications...')
  
  const notifications = []
  
  for (const org of organizations) {
    const orgEmployees = employees.filter(e => e.org_id === org.id)
    
    for (let i = 0; i < 10; i++) {
      const recipient = faker.helpers.arrayElement(orgEmployees)
      
      const notification = await prisma.notification.create({
        data: {
          org_id: org.id,
          recipient_id: recipient.id,
          type: faker.helpers.arrayElement(['EMAIL', 'SMS']),
          template: 'visitor_checkin',
          subject: 'Visitor Check-in Notification',
          content: `Hello ${recipient.first_name}, your visitor has checked in.`,
          status: faker.helpers.arrayElement(['SENT', 'PENDING', 'FAILED'], { weights: [7, 2, 1] }),
          sent_at: faker.datatype.boolean(0.8) ? faker.date.recent({ days: 7 }) : null,
          metadata: {
            visitor_name: faker.person.fullName(),
            visit_id: faker.string.uuid(),
          },
        },
      })
      
      notifications.push(notification)
    }
  }
  
  console.log(`✅ Created ${notifications.length} notifications`)
  return notifications
}

async function main() {
  console.log('🌱 Starting VMS database seeding...\n')
  
  try {
    await clearDatabase()
    
    const organizations = await createOrganizations()
    const locations = await createLocations(organizations)
    const employees = await createEmployees(organizations, locations)
    const visitors = await createVisitors()
    const agreements = await createAgreements(organizations)
    const kiosks = await createKiosks(organizations, locations)
    const webhooks = await createWebhooks(organizations)
    const visits = await createVisits(organizations, locations, employees, visitors, agreements)
    await createAuditLogs(organizations, employees, visits)
    await createSampleNotifications(organizations, employees)
    
    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n🔑 Sample Login Credentials:')
    
    // Show sample login credentials
    for (const org of organizations.slice(0, 2)) {
      const admin = employees.find(e => e.org_id === org.id && e.role === 'ADMIN')
      
      if (admin) {
        console.log(`  ${org.name}:`)
        console.log(`    Email: ${admin.email}`)
        console.log(`    Password: password123 (default)`)
        console.log(`    Org Slug: ${org.slug}`)
        console.log('')
      }
    }
    
    // Show statistics
    console.log('📊 Database Summary:')
    console.log(`  Organizations: ${organizations.length}`)
    console.log(`  Locations: ${locations.length}`)
    console.log(`  Employees: ${employees.length}`)
    console.log(`  Visitors: ${visitors.length}`)
    console.log(`  Visits: ${visits.length}`)
    console.log(`  Agreements: ${agreements.length}`)
    console.log(`  Kiosks: ${kiosks.length}`)
    console.log(`  Webhooks: ${webhooks.length}`)
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()