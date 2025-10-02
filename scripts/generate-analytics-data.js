#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

// Configuration for analytics data generation
const CONFIG = {
  additionalVisits: 2000, // Additional visits for analytics
  daysBack: 365, // Generate data for the past year
  peakHours: [9, 10, 11, 14, 15, 16], // Peak visiting hours
  seasonalVariation: true, // Add seasonal patterns
};

// Seasonal multipliers (higher in certain months)
const SEASONAL_MULTIPLIERS = {
  1: 0.8,  // January - lower after holidays
  2: 0.9,  // February
  3: 1.1,  // March - spring uptick
  4: 1.2,  // April
  5: 1.3,  // May - peak
  6: 1.1,  // June
  7: 0.9,  // July - summer slowdown
  8: 0.8,  // August
  9: 1.2,  // September - back to business
  10: 1.3, // October - peak
  11: 1.1, // November
  12: 0.7, // December - holidays
};

// Day of week multipliers (Monday = 1, Sunday = 0)
const DAY_OF_WEEK_MULTIPLIERS = [0.2, 1.0, 1.2, 1.3, 1.2, 1.0, 0.3];

async function getExistingData() {
  console.log('📊 Analyzing existing data...');
  
  const organizations = await prisma.organization.findMany({
    include: {
      locations: true,
      employees: { where: { is_host: true } },
    },
  });
  
  const visitors = await prisma.visitor.findMany();
  
  console.log(`Found ${organizations.length} organizations, ${visitors.length} visitors`);
  
  return { organizations, visitors };
}

function generateVisitDate(daysBack) {
  const now = new Date();
  const daysAgo = faker.number.int({ min: 0, max: daysBack });
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  
  // Apply seasonal variation
  const month = date.getMonth() + 1;
  const seasonalMultiplier = CONFIG.seasonalVariation ? SEASONAL_MULTIPLIERS[month] : 1;
  
  // Apply day of week variation
  const dayOfWeek = date.getDay();
  const dayMultiplier = DAY_OF_WEEK_MULTIPLIERS[dayOfWeek];
  
  // Skip if random factor suggests this day should have fewer visits
  const combinedMultiplier = seasonalMultiplier * dayMultiplier;
  if (Math.random() > combinedMultiplier) {
    return null; // Skip this visit
  }
  
  // Set time during business hours with peak hour bias
  let hour;
  if (Math.random() < 0.6 && CONFIG.peakHours.length > 0) {
    // 60% chance of peak hour
    hour = faker.helpers.arrayElement(CONFIG.peakHours);
  } else {
    // Regular business hours
    hour = faker.number.int({ min: 8, max: 18 });
  }
  
  const minute = faker.number.int({ min: 0, max: 59 });
  date.setHours(hour, minute, 0, 0);
  
  return date;
}

function generateVisitDuration() {
  // More realistic visit duration distribution
  const durations = [
    { duration: 15, weight: 0.1 },   // Quick visits
    { duration: 30, weight: 0.2 },   // Short meetings
    { duration: 60, weight: 0.3 },   // Standard meetings
    { duration: 90, weight: 0.2 },   // Long meetings
    { duration: 120, weight: 0.1 },  // Extended sessions
    { duration: 180, weight: 0.05 }, // Half day
    { duration: 240, weight: 0.03 }, // Long sessions
    { duration: 480, weight: 0.02 }, // Full day
  ];
  
  return faker.helpers.weightedArrayElement(durations);
}

function generateVisitStatus(scheduledStart) {
  const now = new Date();
  
  if (scheduledStart > now) {
    return { status: 'PENDING', checkInTime: null, checkOutTime: null };
  }
  
  // For past visits, determine status based on realistic patterns
  const statusWeights = [
    { value: 'CHECKED_OUT', weight: 0.75 }, // Most visits complete normally
    { value: 'NO_SHOW', weight: 0.15 },     // Some no-shows
    { value: 'CHECKED_IN', weight: 0.08 },  // Some still in progress
    { value: 'PENDING', weight: 0.02 },     // Few never processed
  ];
  
  const status = faker.helpers.weightedArrayElement(statusWeights);
  
  let checkInTime = null;
  let checkOutTime = null;
  
  if (status === 'CHECKED_IN' || status === 'CHECKED_OUT') {
    // Check-in time: usually close to scheduled time
    const checkInDelay = faker.number.int({ min: -10, max: 30 }); // -10 to +30 minutes
    checkInTime = new Date(scheduledStart.getTime() + checkInDelay * 60 * 1000);
    
    if (status === 'CHECKED_OUT') {
      const duration = generateVisitDuration();
      const actualDuration = duration + faker.number.int({ min: -15, max: 60 }); // Some variation
      checkOutTime = new Date(checkInTime.getTime() + Math.max(5, actualDuration) * 60 * 1000);
    }
  }
  
  return { status, checkInTime, checkOutTime };
}

async function generateAnalyticsVisits(organizations, visitors) {
  console.log('📈 Generating analytics visits...');
  
  const visits = [];
  let created = 0;
  let skipped = 0;
  
  for (let i = 0; i < CONFIG.additionalVisits; i++) {
    const org = faker.helpers.arrayElement(organizations);
    const location = faker.helpers.arrayElement(org.locations);
    const host = faker.helpers.arrayElement(org.employees);
    const visitor = faker.helpers.arrayElement(visitors);
    
    if (!location || !host) {
      skipped++;
      continue;
    }
    
    const scheduledStart = generateVisitDate(CONFIG.daysBack);
    if (!scheduledStart) {
      skipped++;
      continue; // Skip this visit due to seasonal/day factors
    }
    
    const duration = generateVisitDuration();
    const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60 * 1000);
    
    const { status, checkInTime, checkOutTime } = generateVisitStatus(scheduledStart);
    
    // Generate badge number for checked-in visits
    let badgeNumber = null;
    if (status === 'CHECKED_IN' || status === 'CHECKED_OUT') {
      const dateStr = scheduledStart.toISOString().slice(0, 10).replace(/-/g, '');
      const sequence = String(created % 999 + 1).padStart(3, '0');
      badgeNumber = `${location.name.substring(0, 2).toUpperCase()}-${dateStr}-${sequence}`;
    }
    
    // Create visit with realistic patterns
    const visit = await prisma.visit.create({
      data: {
        org_id: org.id,
        location_id: location.id,
        visitor_id: visitor.id,
        host_id: host.id,
        purpose: faker.helpers.arrayElement(['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST', 'OTHER']),
        status,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        badge_number: badgeNumber,
        qr_code: `QR-${org.slug}-${i}-${Date.now()}`,
        photo_url: (status === 'CHECKED_IN' || status === 'CHECKED_OUT') && faker.datatype.boolean(0.8) ?
          `https://images.unsplash.com/photo-${faker.number.int({ min: 1500000000000, max: 1640000000000 })}?w=400&q=80` : null,
        signature_url: faker.datatype.boolean(0.2) && (status === 'CHECKED_IN' || status === 'CHECKED_OUT') ?
          `https://example.com/signatures/${faker.string.uuid()}.png` : null,
        notes: faker.datatype.boolean(0.05) ? faker.lorem.sentence() : null,
        metadata: {
          kiosk_id: `kiosk-${location.id}-001`,
          check_in_method: faker.helpers.arrayElement(['kiosk', 'manual', 'qr_code']),
          language_used: visitor.preferred_language,
          weather: faker.helpers.arrayElement(['sunny', 'cloudy', 'rainy', 'snowy']),
          traffic_level: faker.helpers.arrayElement(['low', 'medium', 'high']),
        },
      },
    });
    
    visits.push(visit);
    created++;
    
    // Create audit logs for realistic tracking
    await createAuditLogs(visit, host.id, org.id);
    
    if (created % 200 === 0) {
      console.log(`  📊 Created ${created}/${CONFIG.additionalVisits} analytics visits... (skipped: ${skipped})`);
    }
  }
  
  console.log(`✅ Created ${created} analytics visits (skipped ${skipped} due to patterns)`);
  return visits;
}

async function createAuditLogs(visit, hostId, orgId) {
  // Create audit log for visit creation
  await prisma.auditLog.create({
    data: {
      org_id: orgId,
      user_id: hostId,
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
      created_at: new Date(visit.scheduled_start.getTime() - 24 * 60 * 60 * 1000), // Day before
    },
  });
  
  // Create audit logs for status changes
  if (visit.check_in_time) {
    await prisma.auditLog.create({
      data: {
        org_id: orgId,
        user_id: hostId,
        action: 'UPDATE',
        resource_type: 'VISIT',
        resource_id: visit.id,
        old_values: { status: 'PENDING' },
        new_values: { 
          status: 'CHECKED_IN', 
          check_in_time: visit.check_in_time,
          badge_number: visit.badge_number,
        },
        ip_address: faker.internet.ip(),
        user_agent: 'VMS-Kiosk/1.0',
        created_at: visit.check_in_time,
      },
    });
  }
  
  if (visit.check_out_time) {
    await prisma.auditLog.create({
      data: {
        org_id: orgId,
        user_id: hostId,
        action: 'UPDATE',
        resource_type: 'VISIT',
        resource_id: visit.id,
        old_values: { status: 'CHECKED_IN' },
        new_values: { 
          status: 'CHECKED_OUT', 
          check_out_time: visit.check_out_time,
        },
        ip_address: faker.internet.ip(),
        user_agent: 'VMS-Kiosk/1.0',
        created_at: visit.check_out_time,
      },
    });
  }
}

async function generateAnalyticsSummary() {
  console.log('📊 Generating analytics summary...');
  
  // Get comprehensive statistics
  const totalVisits = await prisma.visit.count();
  
  const visitsByMonth = await prisma.$queryRaw`
    SELECT 
      EXTRACT(YEAR FROM scheduled_start) as year,
      EXTRACT(MONTH FROM scheduled_start) as month,
      COUNT(*) as count
    FROM "Visit"
    WHERE scheduled_start >= NOW() - INTERVAL '12 months'
    GROUP BY year, month
    ORDER BY year, month
  `;
  
  const visitsByHour = await prisma.$queryRaw`
    SELECT 
      EXTRACT(HOUR FROM scheduled_start) as hour,
      COUNT(*) as count
    FROM "Visit"
    WHERE scheduled_start >= NOW() - INTERVAL '3 months'
    GROUP BY hour
    ORDER BY hour
  `;
  
  const visitsByDayOfWeek = await prisma.$queryRaw`
    SELECT 
      EXTRACT(DOW FROM scheduled_start) as day_of_week,
      COUNT(*) as count
    FROM "Visit"
    WHERE scheduled_start >= NOW() - INTERVAL '3 months'
    GROUP BY day_of_week
    ORDER BY day_of_week
  `;
  
  const avgVisitDuration = await prisma.$queryRaw`
    SELECT 
      AVG(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/60) as avg_duration_minutes
    FROM "Visit"
    WHERE check_in_time IS NOT NULL AND check_out_time IS NOT NULL
  `;
  
  const topCompanies = await prisma.$queryRaw`
    SELECT 
      v.company,
      COUNT(*) as visit_count
    FROM "Visit" vi
    JOIN "Visitor" v ON vi.visitor_id = v.id
    WHERE vi.scheduled_start >= NOW() - INTERVAL '6 months'
    GROUP BY v.company
    ORDER BY visit_count DESC
    LIMIT 10
  `;
  
  console.log('\n📈 Analytics Summary:');
  console.log(`  Total Visits: ${totalVisits}`);
  console.log(`  Average Visit Duration: ${Math.round(avgVisitDuration[0]?.avg_duration_minutes || 0)} minutes`);
  
  console.log('\n📅 Monthly Distribution (Last 12 months):');
  visitsByMonth.forEach(row => {
    const monthName = new Date(row.year, row.month - 1).toLocaleString('default', { month: 'long' });
    console.log(`  ${monthName} ${row.year}: ${row.count} visits`);
  });
  
  console.log('\n⏰ Hourly Distribution (Last 3 months):');
  visitsByHour.forEach(row => {
    const hour = String(row.hour).padStart(2, '0');
    console.log(`  ${hour}:00: ${row.count} visits`);
  });
  
  console.log('\n📊 Day of Week Distribution (Last 3 months):');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  visitsByDayOfWeek.forEach(row => {
    console.log(`  ${dayNames[row.day_of_week]}: ${row.count} visits`);
  });
  
  console.log('\n🏢 Top Companies (Last 6 months):');
  topCompanies.forEach((row, index) => {
    console.log(`  ${index + 1}. ${row.company}: ${row.visit_count} visits`);
  });
}

async function main() {
  console.log('📊 Starting analytics data generation...\n');
  
  try {
    const { organizations, visitors } = await getExistingData();
    
    if (organizations.length === 0 || visitors.length === 0) {
      console.log('❌ No existing data found. Please run the main seed script first.');
      process.exit(1);
    }
    
    await generateAnalyticsVisits(organizations, visitors);
    await generateAnalyticsSummary();
    
    console.log('\n🎉 Analytics data generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error generating analytics data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();