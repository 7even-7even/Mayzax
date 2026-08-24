import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  try {
    console.log('1. Registering PG trigger function...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION notify_admins_of_inquiry_or_partner()
      RETURNS TRIGGER AS $$
      DECLARE
        admin_rec RECORD;
        notif_id TEXT;
        notif_title TEXT;
        notif_body TEXT;
        notif_data JSONB;
      BEGIN
        -- Determine if it's an inquiry or hiring partner request
        IF TG_TABLE_NAME = 'inquiries' THEN
          notif_title := 'New Candidate Enquiry';
          notif_body := NEW."fullName" || ' submitted a new website enquiry for ' || NEW."serviceInterested" || '.';
          notif_data := jsonb_build_object(
            'screen', 'Monitoring',
            'subType', 'CANDIDATE_ENQUIRY',
            'targetId', NEW.id
          );
        ELSIF TG_TABLE_NAME = 'hiring_partner_requests' THEN
          notif_title := 'New Partner Request';
          notif_body := NEW."contactName" || ' from ' || NEW.company || ' requested to become a hiring partner.';
          notif_data := jsonb_build_object(
            'screen', 'Monitoring',
            'subType', 'PARTNER_REQUEST',
            'targetId', NEW.id
          );
        END IF;

        -- Insert notification for all active, non-deleted admins
        FOR admin_rec IN 
          SELECT id FROM users WHERE role = 'ADMIN' AND "deletedAt" IS NULL AND "isActive" = true
        LOOP
          -- Generate UUID for the notification
          notif_id := gen_random_uuid()::text;
          
          INSERT INTO notifications (id, "userId", type, title, body, data, priority, "createdAt")
          VALUES (notif_id, admin_rec.id, 'SYSTEM', notif_title, notif_body, notif_data, 0, NOW());
        END LOOP;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('2. Dropping old triggers if exists...');
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS trg_notify_admins_inquiry ON inquiries;
    `);
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS trg_notify_admins_partner ON hiring_partner_requests;
    `);

    console.log('3. Creating trigger for inquiries...');
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trg_notify_admins_inquiry
      AFTER INSERT ON inquiries
      FOR EACH ROW
      EXECUTE FUNCTION notify_admins_of_inquiry_or_partner();
    `);

    console.log('4. Creating trigger for hiring partner requests...');
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trg_notify_admins_partner
      AFTER INSERT ON hiring_partner_requests
      FOR EACH ROW
      EXECUTE FUNCTION notify_admins_of_inquiry_or_partner();
    `);

    console.log('Triggers registered successfully!');
  } catch (error) {
    console.error('Failed to register triggers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
