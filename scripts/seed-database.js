#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

// Configuration
const CONFIG = {
  organizations: 3,
  locationsPerOrg: 2,
  employeesPerOrg: 10,
  visitorsCount: 200,
  historicalVisits: 1000,
  daysBack: 90,
};

// Visit purposes and statuses
const VISIT_PURPOSES = ['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST', 'OTHER'];
const VISIT_STATUSES = ['PENDING', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'];
const EMPLOYEE_ROLES = ['ADMIN', 'RECEPTIONIST', 'SECURITY', 'MANAGER'];

// Multi-language data
const LANGUAGES = ['en', 'es', 'fr', 'de', 'zh'];
const COMPANIES_BY_LANGUAGE = {
  en: ['Acme Corp', 'TechStart Inc', 'Global Solutions', 'Innovation Labs', 'Future Systems'],
  es: ['Empresa Ejemplo', 'Tecnología Avanzada', 'Soluciones Globales', 'Innovación SA', 'Sistemas del Futuro'],
  fr: ['Société Exemple', 'Technologies Avancées', 'Solutions Mondiales', 'Laboratoires Innovation', 'Systèmes Futurs'],
  de: ['Beispiel GmbH', 'Fortgeschrittene Technologie', 'Globale Lösungen', 'Innovations Labor', 'Zukunftssysteme'],
  zh: ['示例公司', '先进技术', '全球解决方案', '创新实验室', '未来系统'],
};

const NAMES_BY_LANGUAGE = {
  en: { first: ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily'], last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'] },
  es: { first: ['Carlos', 'María', 'José', 'Ana', 'Luis', 'Carmen'], last: ['García', 'Rodríguez', 'López', 'Martínez', 'González', 'Pérez'] },
  fr: { first: ['Pierre', 'Marie', 'Jean', 'Sophie', 'Michel', 'Claire'], last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit'] },
  de: { first: ['Hans', 'Anna', 'Klaus', 'Greta', 'Wolfgang', 'Ingrid'], last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer'] },
  zh: { first: ['明', '丽', '伟', '芳', '强', '娟'], last: ['李', '王', '张', '刘', '陈', '杨'] },
};

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  // Delete in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.location.deleteMany();
  await prisma.organization.deleteMany();
  
  console.log('✅ Database cleared');
}

async function createOrganizations() {
  console.log('🏢 Creating organizations...');
  
  const organizations = [];
  
  for (let i = 0; i < CONFIG.organizations; i++) {
    const org = await prisma.organization.create({
      data: {
        name: faker.company.name(),
        slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
        domain: faker.internet.domainName(),
        logo_url: `https://images.unsplash.com/photo-${faker.number.int({ min: 1560000000000, max: 1640000000000 })}?w=200&q=80`,
        website: faker.internet.url(),
        industry: faker.helpers.arrayElement(['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail']),
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
    });
    
    organizations.push(org);
  }
  
  console.log(`✅ Created ${organizations.length} organizations`);
  return organizations;
}

async function createLocations(organizations) {
  console.log('📍 Creating locations...');
  
  const locations = [];
  
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
            languages: faker.helpers.arrayElements(LANGUAGES, { min: 1, max: 3 }),
            theme: faker.helpers.arrayElement(['light', 'dark']),
          },
        },
      });
      
      locations.push(location);
    }
  }
  
  console.log(`✅ Created ${locations.length} locations`);
  return locations;
}

async function createEmployees(organizations) {
  console.log('👥 Creating employees...');
  
  const employees = [];
  
  for (const org of organizations) {
    for (let i = 0; i < CONFIG.employeesPerOrg; i++) {
      const role = i === 0 ? 'ADMIN' : faker.helpers.arrayElement(EMPLOYEE_ROLES);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      
      const employee = await prisma.employee.create({
        data: {
          org_id: org.id,
          first_name: firstName,
          last_name: lastName,
          email: faker.internet.email({ firstName, lastName, provider: org.domain }),
          role,
          is_host: faker.datatype.boolean(0.7), // 70% chance of being a host
          department: faker.helpers.arrayElement(['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations']),
          job_title: faker.person.jobTitle(),
          phone: faker.phone.number(),
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}`,
          status: faker.helpers.arrayElement(['ACTIVE', 'INACTIVE'], { weights: [9, 1] }),
          last_login_at: faker.date.recent({ days: 30 }),
          created_by: 'seed-script',
        },
      });
      
      employees.push(employee);
    }
  }
  
  console.log(`✅ Created ${employees.length} employees`);
  return employees;
}

async function createVisitors() {
  console.log('🚶 Creating visitors...');
  
  const visitors = [];
  
  for (let i = 0; i < CONFIG.visitorsCount; i++) {
    const language = faker.helpers.arrayElement(LANGUAGES);
    const names = NAMES_BY_LANGUAGE[language];
    const companies = COMPANIES_BY_LANGUAGE[language];
    
    const firstName = faker.helpers.arrayElement(names.first);
    const lastName = faker.helpers.arrayElement(names.last);
    
    const visitor = await prisma.visitor.create({
      data: {
        first_name: firstName,
        last_name: lastName,
        email: faker.internet.email({ firstName, lastName }),
        phone: faker.phone.number(),
        company: faker.helpers.arrayElement(companies),
        photo_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}${i}`,
        preferred_language: language,
        marketing_opt_in: faker.datatype.boolean(0.3),
        notes: faker.datatype.boolean(0.2) ? faker.lorem.sentence() : null,
      },
    });
    
    visitors.push(visitor);
  }
  
  console.log(`✅ Created ${visitors.length} visitors`);
  return visitors;
}

async function createHistoricalVisits(organizations, locations, employees, visitors) {
  console.log('📅 Creating historical visits...');
  
  const visits = [];
  const now = new Date();
  
  for (let i = 0; i < CONFIG.historicalVisits; i++) {
    const org = faker.helpers.arrayElement(organizations);
    const orgLocations = locations.filter(l => l.org_id === org.id);
    const orgEmployees = employees.filter(e => e.org_id === org.id && e.is_host);
    
    if (orgLocations.length === 0 || orgEmployees.length === 0) continue;
    
    const location = faker.helpers.arrayElement(orgLocations);
    const host = faker.helpers.arrayElement(orgEmployees);
    const visitor = faker.helpers.arrayElement(visitors);
    
    // Generate visit date within the last 90 days
    const daysAgo = faker.number.int({ min: 0, max: CONFIG.daysBack });
    const hoursOffset = faker.number.int({ min: 8, max: 18 }); // Business hours
    const minutesOffset = faker.number.int({ min: 0, max: 59 });
    
    const scheduledStart = new Date(now);
    scheduledStart.setDate(scheduledStart.getDate() - daysAgo);
    scheduledStart.setHours(hoursOffset, minutesOffset, 0, 0);
    
    const duration = faker.number.int({ min: 30, max: 240 }); // 30 minutes to 4 hours
    const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60 * 1000);
    
    // Determine visit status based on date
    let status = 'PENDING';
    let checkInTime = null;
    let checkOutTime = null;
    let badgeNumber = null;
    
    if (scheduledStart < now) {
      const statusWeights = [
        { value: 'CHECKED_OUT', weight: 0.7 },
        { value: 'NO_SHOW', weight: 0.15 },
        { value: 'CHECKED_IN', weight: 0.1 }, // Some still checked in
        { value: 'PENDING', weight: 0.05 },
      ];
      
      status = faker.helpers.weightedArrayElement(statusWeights);
      
      if (status === 'CHECKED_IN' || status === 'CHECKED_OUT') {
        checkInTime = new Date(scheduledStart.getTime() + faker.number.int({ min: -15, max: 30 }) * 60 * 1000);
        badgeNumber = `${location.name.substring(0, 2).toUpperCase()}-${scheduledStart.toISOString().slice(0, 10).replace(/-/g, '')}-${String(i).padStart(3, '0')}`;
        
        if (status === 'CHECKED_OUT') {
          const actualDuration = faker.number.int({ min: 15, max: duration + 60 });
          checkOutTime = new Date(checkInTime.getTime() + actualDuration * 60 * 1000);
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
        photo_url: status === 'CHECKED_IN' || status === 'CHECKED_OUT' ? 
          `https://images.unsplash.com/photo-${faker.number.int({ min: 1500000000000, max: 1640000000000 })}?w=400&q=80` : null,
        signature_url: faker.datatype.boolean(0.3) && (status === 'CHECKED_IN' || status === 'CHECKED_OUT') ?
          `https://example.com/signatures/${faker.string.uuid()}.png` : null,
        notes: faker.datatype.boolean(0.1) ? faker.lorem.sentence() : null,
        metadata: {
          kiosk_id: `kiosk-${location.id}-001`,
          check_in_method: faker.helpers.arrayElement(['kiosk', 'manual', 'qr_code']),
          language_used: visitor.preferred_language,
        },
      },
    });
    
    visits.push(visit);
    
    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        org_id: org.id,
        user_id: host.id,
        action: 'CREATE',
        resource_type: 'VISIT',
        resource_id: visit.id,
        old_values: null,
        new_values: {
          visitor_id: visitor.id,
          status: 'PENDING',
          purpose: visit.purpose,
        },
        ip_address: faker.internet.ip(),
        user_agent: faker.internet.userAgent(),
      },
    });
    
    // Create additional audit logs for status changes
    if (status === 'CHECKED_IN' || status === 'CHECKED_OUT') {
      await prisma.auditLog.create({
        data: {
          org_id: org.id,
          user_id: host.id,
          action: 'UPDATE',
          resource_type: 'VISIT',
          resource_id: visit.id,
          old_values: { status: 'PENDING' },
          new_values: { status: 'CHECKED_IN', check_in_time: checkInTime },
          ip_address: faker.internet.ip(),
          user_agent: 'VMS-Kiosk/1.0',
          created_at: checkInTime,
        },
      });
      
      if (status === 'CHECKED_OUT') {
        await prisma.auditLog.create({
          data: {
            org_id: org.id,
            user_id: host.id,
            action: 'UPDATE',
            resource_type: 'VISIT',
            resource_id: visit.id,
            old_values: { status: 'CHECKED_IN' },
            new_values: { status: 'CHECKED_OUT', check_out_time: checkOutTime },
            ip_address: faker.internet.ip(),
            user_agent: 'VMS-Kiosk/1.0',
            created_at: checkOutTime,
          },
        });
      }
    }
    
    if (i % 100 === 0) {
      console.log(`  📊 Created ${i}/${CONFIG.historicalVisits} visits...`);
    }
  }
  
  console.log(`✅ Created ${visits.length} historical visits`);
  return visits;
}

async function createAnalyticsData() {
  console.log('📈 Generating analytics summary...');
  
  // Get some statistics
  const totalOrgs = await prisma.organization.count();
  const totalLocations = await prisma.location.count();
  const totalEmployees = await prisma.employee.count();
  const totalVisitors = await prisma.visitor.count();
  const totalVisits = await prisma.visit.count();
  
  const visitsByStatus = await prisma.visit.groupBy({
    by: ['status'],
    _count: { status: true },
  });
  
  const visitsByPurpose = await prisma.visit.groupBy({
    by: ['purpose'],
    _count: { purpose: true },
  });
  
  console.log('\n📊 Database Summary:');
  console.log(`  Organizations: ${totalOrgs}`);
  console.log(`  Locations: ${totalLocations}`);
  console.log(`  Employees: ${totalEmployees}`);
  console.log(`  Visitors: ${totalVisitors}`);
  console.log(`  Visits: ${totalVisits}`);
  
  console.log('\n📈 Visit Statistics:');
  visitsByStatus.forEach(stat => {
    console.log(`  ${stat.status}: ${stat._count.status}`);
  });
  
  console.log('\n🎯 Visit Purposes:');
  visitsByPurpose.forEach(stat => {
    console.log(`  ${stat.purpose}: ${stat._count.purpose}`);
  });
}

async function main() {
  console.log('🌱 Starting VMS database seeding...\n');
  
  try {
    await clearDatabase();
    
    const organizations = await createOrganizations();
    const locations = await createLocations(organizations);
    const employees = await createEmployees(organizations);
    const visitors = await createVisitors();
    const visits = await createHistoricalVisits(organizations, locations, employees, visitors);
    
    await createAnalyticsData();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n🔑 Sample Login Credentials:');
    
    // Show sample login credentials
    for (const org of organizations.slice(0, 2)) {
      const admin = await prisma.employee.findFirst({
        where: { org_id: org.id, role: 'ADMIN' },
      });
      
      if (admin) {
        console.log(`  ${org.name}:`);
        console.log(`    Email: ${admin.email}`);
        console.log(`    Password: password123 (default)`);
        console.log(`    Org Slug: ${org.slug}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();