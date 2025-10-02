import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// Encryption helper (placeholder - in production use proper KMS)
const encryptPII = (data: string): string => {
  // In production, use AWS KMS, Azure Key Vault, or similar
  // This is a placeholder for demonstration
  return Buffer.from(data).toString('base64');
};

async function main() {
  console.log('🌱 Starting database seed...');

  // Create organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      plan: 'PROFESSIONAL',
      settings: {
        timezone: 'America/New_York',
        business_hours: {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' },
          saturday: null,
          sunday: null,
        },
        visitor_badge_template: {
          logo_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&q=80',
          show_photo: true,
          show_qr_code: true,
          background_color: '#ffffff',
          text_color: '#000000',
        },
      },
    },
  });

  console.log(`✅ Created organization: ${organization.name}`);

  // Create locations
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        org_id: organization.id,
        name: 'New York Headquarters',
        time_zone: 'America/New_York',
        address: {
          street: '123 Business Ave',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'USA',
        },
        settings: {
          max_concurrent_visitors: 50,
          require_host_approval: false,
          auto_checkout_hours: 8,
          visitor_wifi: {
            ssid: 'AcmeGuest',
            password: 'Welcome2023',
          },
        },
        created_by: 'system',
      },
    }),
    prisma.location.create({
      data: {
        org_id: organization.id,
        name: 'San Francisco Office',
        time_zone: 'America/Los_Angeles',
        address: {
          street: '456 Tech Blvd',
          city: 'San Francisco',
          state: 'CA',
          zip: '94105',
          country: 'USA',
        },
        settings: {
          max_concurrent_visitors: 25,
          require_host_approval: true,
          auto_checkout_hours: 6,
        },
        created_by: 'system',
      },
    }),
  ]);

  console.log(`✅ Created ${locations.length} locations`);

  // Create employees
  const employees = await Promise.all([
    // Admin users
    prisma.employee.create({
      data: {
        org_id: organization.id,
        location_id: locations[0].id,
        first_name: 'John',
        last_name: 'Admin',
        email: 'john.admin@acme.com',
        phone: '+1-555-0101',
        role: 'ADMIN',
        is_host: true,
        status: 'ACTIVE',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
        created_by: 'system',
      },
    }),
    prisma.employee.create({
      data: {
        org_id: organization.id,
        location_id: locations[1].id,
        first_name: 'Sarah',
        last_name: 'Manager',
        email: 'sarah.manager@acme.com',
        phone: '+1-555-0102',
        role: 'MANAGER',
        is_host: true,
        status: 'ACTIVE',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
        created_by: 'system',
      },
    }),
    // Receptionists
    prisma.employee.create({
      data: {
        org_id: organization.id,
        location_id: locations[0].id,
        first_name: 'Emily',
        last_name: 'Reception',
        email: 'emily.reception@acme.com',
        phone: '+1-555-0103',
        role: 'RECEPTIONIST',
        is_host: false,
        status: 'ACTIVE',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily',
        created_by: 'system',
      },
    }),
    prisma.employee.create({
      data: {
        org_id: organization.id,
        location_id: locations[1].id,
        first_name: 'Mike',
        last_name: 'Desk',
        email: 'mike.desk@acme.com',
        role: 'RECEPTIONIST',
        is_host: false,
        status: 'ACTIVE',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
        created_by: 'system',
      },
    }),
    // Security
    prisma.employee.create({
      data: {
        org_id: organization.id,
        location_id: locations[0].id,
        first_name: 'David',
        last_name: 'Security',
        email: 'david.security@acme.com',
        phone: '+1-555-0104',
        role: 'SECURITY',
        is_host: false,
        status: 'ACTIVE',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
        created_by: 'system',
      },
    }),
    // Additional host
    prisma.employee.create({
      data: {
        org_id: organization.id,
        location_id: locations[0].id,
        first_name: 'Lisa',
        last_name: 'Host',
        email: 'lisa.host@acme.com',
        phone: '+1-555-0105',
        role: 'MANAGER',
        is_host: true,
        status: 'ACTIVE',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa',
        created_by: 'system',
      },
    }),
  ]);

  console.log(`✅ Created ${employees.length} employees`);

  // Create visitors with encrypted PII
  const visitors = await Promise.all([
    prisma.visitor.create({
      data: {
        org_id: organization.id,
        first_name: 'Alice',
        last_name: 'Johnson',
        email_encrypted: encryptPII('alice.johnson@techcorp.com'),
        phone_encrypted: encryptPII('+1-555-1001'),
        company: 'TechCorp Solutions',
        photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
        preferred_language: 'en',
        marketing_opt_in: true,
        created_by: 'system',
      },
    }),
    prisma.visitor.create({
      data: {
        org_id: organization.id,
        first_name: 'Bob',
        last_name: 'Smith',
        email_encrypted: encryptPII('bob.smith@innovate.io'),
        phone_encrypted: encryptPII('+1-555-1002'),
        company: 'Innovate.io',
        photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
        preferred_language: 'en',
        marketing_opt_in: false,
        created_by: 'system',
      },
    }),
    prisma.visitor.create({
      data: {
        org_id: organization.id,
        first_name: 'Carol',
        last_name: 'Davis',
        email_encrypted: encryptPII('carol.davis@startup.com'),
        phone_encrypted: encryptPII('+1-555-1003'),
        company: 'Startup Inc',
        preferred_language: 'en',
        notes: 'VIP client - requires special attention',
        marketing_opt_in: true,
        created_by: 'system',
      },
    }),
    prisma.visitor.create({
      data: {
        org_id: organization.id,
        first_name: 'Daniel',
        last_name: 'Wilson',
        email_encrypted: encryptPII('daniel.wilson@consulting.com'),
        company: 'Wilson Consulting',
        preferred_language: 'en',
        marketing_opt_in: false,
        created_by: 'system',
      },
    }),
    prisma.visitor.create({
      data: {
        org_id: organization.id,
        first_name: 'Eva',
        last_name: 'Martinez',
        email_encrypted: encryptPII('eva.martinez@design.studio'),
        phone_encrypted: encryptPII('+1-555-1004'),
        company: 'Design Studio',
        preferred_language: 'es',
        marketing_opt_in: true,
        created_by: 'system',
      },
    }),
    prisma.visitor.create({
      data: {
        org_id: organization.id,
        first_name: 'Frank',
        last_name: 'Brown',
        email_encrypted: encryptPII('frank.brown@legal.firm'),
        phone_encrypted: encryptPII('+1-555-1005'),
        company: 'Brown Legal Firm',
        preferred_language: 'en',
        marketing_opt_in: false,
        created_by: 'system',
      },
    }),
    prisma.visitor.create({
      data: {
        org_id: organization.id,
        first_name: 'Grace',
        last_name: 'Lee',
        email_encrypted: encryptPII('grace.lee@media.com'),
        company: 'Media Corp',
        preferred_language: 'en',
        marketing_opt_in: true,
        created_by: 'system',
      },
    }),
    prisma.visitor.create({
      data: {
        org_id: organization.id,
        first_name: 'Henry',
        last_name: 'Taylor',
        phone_encrypted: encryptPII('+1-555-1006'),
        company: 'Taylor Industries',
        preferred_language: 'en',
        marketing_opt_in: false,
        created_by: 'system',
      },
    }),
    prisma.visitor.create({
      data: {
        org_id: organization.id,
        first_name: 'Iris',
        last_name: 'Chen',
        email_encrypted: encryptPII('iris.chen@fintech.com'),
        phone_encrypted: encryptPII('+1-555-1007'),
        company: 'FinTech Solutions',
        preferred_language: 'zh',
        marketing_opt_in: true,
        created_by: 'system',
      },
    }),
    prisma.visitor.create({
      data: {
        org_id: organization.id,
        first_name: 'Jack',
        last_name: 'Anderson',
        email_encrypted: encryptPII('jack.anderson@freelance.com'),
        preferred_language: 'en',
        notes: 'Freelance contractor',
        marketing_opt_in: false,
        created_by: 'system',
      },
    }),
  ]);

  console.log(`✅ Created ${visitors.length} visitors`);

  // Create visits
  const now = new Date();
  const visits = await Promise.all([
    // Current checked-in visits
    prisma.visit.create({
      data: {
        org_id: organization.id,
        location_id: locations[0].id,
        visitor_id: visitors[0].id,
        host_employee_id: employees[0].id,
        purpose: 'MEETING',
        pre_registered: true,
        scheduled_start: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago
        check_in_time: new Date(now.getTime() - 25 * 60 * 1000), // 25 min ago
        status: 'CHECKED_IN',
        badge_number: 'B001',
        qr_code: 'QR_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        metadata: {
          check_in_method: 'kiosk',
          agreements_signed: ['nda', 'safety'],
        },
        created_by: 'system',
      },
    }),
    prisma.visit.create({
      data: {
        org_id: organization.id,
        location_id: locations[1].id,
        visitor_id: visitors[1].id,
        host_employee_id: employees[1].id,
        purpose: 'INTERVIEW',
        pre_registered: false,
        check_in_time: new Date(now.getTime() - 45 * 60 * 1000), // 45 min ago
        status: 'CHECKED_IN',
        badge_number: 'B002',
        qr_code: 'QR_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        metadata: {
          check_in_method: 'manual',
        },
        created_by: 'system',
      },
    }),
    // Completed visits
    prisma.visit.create({
      data: {
        org_id: organization.id,
        location_id: locations[0].id,
        visitor_id: visitors[2].id,
        host_employee_id: employees[5].id,
        purpose: 'MEETING',
        pre_registered: true,
        scheduled_start: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        check_in_time: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        check_out_time: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
        status: 'CHECKED_OUT',
        badge_number: 'B003',
        qr_code: 'QR_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        created_by: 'system',
      },
    }),
    prisma.visit.create({
      data: {
        org_id: organization.id,
        location_id: locations[0].id,
        visitor_id: visitors[3].id,
        host_employee_id: employees[0].id,
        purpose: 'DELIVERY',
        pre_registered: false,
        check_in_time: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
        check_out_time: new Date(now.getTime() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
        status: 'CHECKED_OUT',
        badge_number: 'B004',
        created_by: 'system',
      },
    }),
    // Pre-registered future visits
    prisma.visit.create({
      data: {
        org_id: organization.id,
        location_id: locations[1].id,
        visitor_id: visitors[4].id,
        host_employee_id: employees[1].id,
        purpose: 'MEETING',
        pre_registered: true,
        scheduled_start: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        status: 'PRE_REGISTERED',
        qr_code: 'QR_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        metadata: {
          pre_registration_email_sent: true,
        },
        created_by: 'system',
      },
    }),
    // More historical visits
    ...Array.from({ length: 7 }, (_, i) => {
      const daysAgo = i + 1;
      const visitTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      return prisma.visit.create({
        data: {
          org_id: organization.id,
          location_id: locations[i % 2].id,
          visitor_id: visitors[(i + 5) % visitors.length].id,
          host_employee_id: employees[i % 2].id,
          purpose: ['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST'][i % 4] as any,
          pre_registered: i % 2 === 0,
          scheduled_start: i % 2 === 0 ? visitTime : null,
          check_in_time: visitTime,
          check_out_time: new Date(visitTime.getTime() + (1 + i * 0.5) * 60 * 60 * 1000),
          status: 'CHECKED_OUT',
          badge_number: `B${String(i + 5).padStart(3, '0')}`,
          created_by: 'system',
        },
      });
    }),
  ]);

  console.log(`✅ Created ${visits.length} visits`);

  // Create kiosk device
  const kioskDevice = await prisma.kioskDevice.create({
    data: {
      org_id: organization.id,
      location_id: locations[0].id,
      name: 'Reception Kiosk - NY HQ',
      device_identifier: 'KIOSK_NY_001',
      app_version: '1.2.3',
      last_seen_at: new Date(),
      settings: {
        ui: {
          theme: 'light',
          logo_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&q=80',
          welcome_message: 'Welcome to Acme Corporation!',
          language_options: ['en', 'es'],
          show_company_field: true,
          show_phone_field: true,
          require_photo: true,
        },
        hardware: {
          camera_enabled: true,
          printer_enabled: true,
          printer_config: {
            printer_type: 'thermal',
            paper_size: '4x6',
            print_logo: true,
          },
        },
        security: {
          session_timeout_minutes: 30,
          max_failed_attempts: 3,
          require_host_approval: false,
        },
      },
      created_by: 'system',
    },
  });

  console.log(`✅ Created kiosk device: ${kioskDevice.name}`);

  // Create agreements
  const agreements = await Promise.all([
    prisma.agreement.create({
      data: {
        org_id: organization.id,
        name: 'Non-Disclosure Agreement',
        version: '2.1',
        content_md: `# Non-Disclosure Agreement

By signing below, you agree to:

1. **Confidentiality**: Keep all information learned during your visit confidential
2. **Non-disclosure**: Not share any proprietary information with third parties
3. **Return of materials**: Return any materials provided during your visit

This agreement is effective immediately and remains in force for 2 years from the date of signing.

**Visitor Signature Required**`,
        is_required: true,
        type: 'NDA',
        locales: {
          en: {
            name: 'Non-Disclosure Agreement',
            content_md: '# Non-Disclosure Agreement\n\nBy signing below, you agree to keep all information confidential...',
          },
          es: {
            name: 'Acuerdo de No Divulgación',
            content_md: '# Acuerdo de No Divulgación\n\nAl firmar a continuación, usted acepta mantener toda la información confidencial...',
          },
        },
        created_by: 'system',
      },
    }),
    prisma.agreement.create({
      data: {
        org_id: organization.id,
        name: 'Safety and Security Guidelines',
        version: '1.0',
        content_md: `# Safety and Security Guidelines

For the safety of all visitors and employees, please acknowledge that you understand:

## Safety Requirements
- Follow all posted safety signs and instructions
- Report any safety concerns immediately to reception
- Do not enter restricted areas without authorization

## Security Requirements  
- Wear your visitor badge at all times
- Do not photograph or record without permission
- Follow your host's instructions at all times

## Emergency Procedures
- In case of emergency, follow evacuation procedures
- Emergency exits are clearly marked
- Report to designated assembly areas

**Acknowledgment Required**`,
        is_required: true,
        type: 'SAFETY',
        created_by: 'system',
      },
    }),
  ]);

  console.log(`✅ Created ${agreements.length} agreements`);

  // Create default notification channels
  const notificationChannels = await Promise.all([
    prisma.notificationChannel.create({
      data: {
        org_id: organization.id,
        type: 'EMAIL',
        provider_config: {
          provider: 'sendgrid',
          api_key: 'SG.placeholder_key',
          from_email: 'noreply@acme.com',
          from_name: 'Acme Visitor Management',
        },
        is_default: true,
        created_by: 'system',
      },
    }),
    prisma.notificationChannel.create({
      data: {
        org_id: organization.id,
        type: 'SMS',
        provider_config: {
          provider: 'twilio',
          account_sid: 'AC_placeholder_sid',
          auth_token: 'placeholder_token',
          from_number: '+1-555-0199',
        },
        is_default: false,
        created_by: 'system',
      },
    }),
  ]);

  console.log(`✅ Created ${notificationChannels.length} notification channels`);

  // Create some audit log entries
  await Promise.all([
    prisma.auditLog.create({
      data: {
        org_id: organization.id,
        actor_user_id: employees[0].id,
        actor_type: 'USER',
        action: 'CREATE',
        entity: 'Visit',
        entity_id: visits[0].id,
        changes: {
          visitor_id: visitors[0].id,
          status: 'CHECKED_IN',
        },
        ip_address: '192.168.1.100',
      },
    }),
    prisma.auditLog.create({
      data: {
        org_id: organization.id,
        actor_type: 'KIOSK',
        action: 'UPDATE',
        entity: 'Visit',
        entity_id: visits[1].id,
        changes: {
          status: 'CHECKED_IN',
          check_in_time: visits[1].check_in_time,
        },
        ip_address: '192.168.1.101',
      },
    }),
  ]);

  console.log('✅ Created audit log entries');

  // Example of encrypted data retrieval (for demonstration)
  console.log('\n📋 Example encrypted data:');
  const sampleVisitor = await prisma.visitor.findFirst({
    where: { email_encrypted: { not: null } },
  });
  
  if (sampleVisitor) {
    console.log(`Visitor: ${sampleVisitor.first_name} ${sampleVisitor.last_name}`);
    console.log(`Encrypted email: ${sampleVisitor.email_encrypted}`);
    console.log(`Decrypted email: ${Buffer.from(sampleVisitor.email_encrypted!, 'base64').toString()}`);
    if (sampleVisitor.phone_encrypted) {
      console.log(`Encrypted phone: ${sampleVisitor.phone_encrypted}`);
      console.log(`Decrypted phone: ${Buffer.from(sampleVisitor.phone_encrypted, 'base64').toString()}`);
    }
  }

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`- 1 Organization: ${organization.name}`);
  console.log(`- ${locations.length} Locations`);
  console.log(`- ${employees.length} Employees (2 hosts)`);
  console.log(`- ${visitors.length} Visitors`);
  console.log(`- ${visits.length} Visits`);
  console.log(`- 1 Kiosk Device`);
  console.log(`- ${agreements.length} Agreements`);
  console.log(`- ${notificationChannels.length} Notification Channels`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });