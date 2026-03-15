const { pool } = require('../config/database');

const migrationSQL = `
-- ============================================
-- CampusOS Database Schema
-- Complete PostgreSQL Migration
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================
-- ENUM TYPES
-- ============================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin', 'department_admin', 'faculty', 
    'student', 'security_staff', 'maintenance_staff'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'academic', 'event', 'emergency', 'department', 'lost_found', 'system'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_target AS ENUM (
    'all', 'department', 'batch', 'class', 'hosteller', 'day_scholar', 'faculty'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM (
    'draft', 'pending_approval', 'approved', 'published', 'rejected', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE complaint_status AS ENUM (
    'open', 'in_progress', 'resolved', 'closed', 'rejected', 'escalated'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE complaint_category AS ENUM (
    'infrastructure', 'academic', 'hostel', 'transport', 
    'canteen', 'it_services', 'library', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE gate_pass_status AS ENUM (
    'pending_faculty', 'pending_hod', 'pending_super_admin',
    'approved', 'rejected', 'active', 'expired', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE gate_pass_type AS ENUM ('hosteller', 'day_scholar', 'faculty', 'hod');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE item_type AS ENUM ('lost', 'found');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE item_status AS ENUM ('reported', 'matched', 'resolved', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE residence_type AS ENUM ('hosteller', 'day_scholar');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- CORE TABLES
-- ============================================

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  hod_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  batch VARCHAR(20) NOT NULL,
  semester INTEGER,
  section VARCHAR(10),
  faculty_advisor_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, department_id, batch, section)
);

-- Users (base table for all roles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  status user_status DEFAULT 'pending',
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  department_id UUID REFERENCES departments(id),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  refresh_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys that reference users
ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_departments_hod;
ALTER TABLE departments ADD CONSTRAINT fk_departments_hod 
  FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE classes DROP CONSTRAINT IF EXISTS fk_classes_advisor;
ALTER TABLE classes ADD CONSTRAINT fk_classes_advisor 
  FOREIGN KEY (faculty_advisor_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_approved_by;
ALTER TABLE users ADD CONSTRAINT fk_users_approved_by 
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Students (extends users)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  roll_number VARCHAR(50) NOT NULL UNIQUE,
  class_id UUID REFERENCES classes(id),
  batch VARCHAR(20),
  residence_type residence_type DEFAULT 'day_scholar',
  hostel_block VARCHAR(50),
  room_number VARCHAR(20),
  father_name VARCHAR(100),
  father_phone VARCHAR(20),
  mother_name VARCHAR(100),
  mother_phone VARCHAR(20),
  id_card_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Faculty (extends users)
CREATE TABLE IF NOT EXISTS faculty (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  faculty_id_number VARCHAR(50) NOT NULL UNIQUE,
  designation VARCHAR(100),
  id_card_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NOTIFICATION TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  ai_summary TEXT,
  type notification_type DEFAULT 'academic',
  status notification_status DEFAULT 'draft',
  target_type notification_target DEFAULT 'all',
  target_department_id UUID REFERENCES departments(id),
  target_batch VARCHAR(20),
  target_class_id UUID REFERENCES classes(id),
  posted_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  attachment_urls TEXT[],
  is_pinned BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- ============================================
-- COMPLAINT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  submitted_by UUID NOT NULL REFERENCES users(id),
  status complaint_status DEFAULT 'open',
  category complaint_category,
  ai_category complaint_category,
  priority complaint_priority DEFAULT 'medium',
  ai_priority complaint_priority,
  ai_sentiment VARCHAR(20),
  department_id UUID REFERENCES departments(id),
  assigned_to UUID REFERENCES users(id),
  evidence_urls TEXT[],
  resolution_notes TEXT,
  resolution_proof_url TEXT,
  escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  sla_deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- LOST & FOUND TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS lost_found_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type item_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255),
  item_date DATE,
  image_urls TEXT[],
  status item_status DEFAULT 'reported',
  reported_by UUID NOT NULL REFERENCES users(id),
  contact_info VARCHAR(255),
  matched_item_id UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Self-referencing FK for matched items
ALTER TABLE lost_found_items DROP CONSTRAINT IF EXISTS fk_matched_item;
ALTER TABLE lost_found_items ADD CONSTRAINT fk_matched_item
  FOREIGN KEY (matched_item_id) REFERENCES lost_found_items(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS item_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lost_item_id UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  found_item_id UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5,4),
  is_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lost_item_id, found_item_id)
);

-- ============================================
-- RESOURCE BOOKING TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  location VARCHAR(255),
  capacity INTEGER,
  department_id UUID REFERENCES departments(id),
  description TEXT,
  amenities TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  booked_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  purpose TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status booking_status DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  qr_token TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Prevent overlapping bookings for same resource
  CONSTRAINT no_overlap EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('approved', 'pending'))
);

-- ============================================
-- GATE PASS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS gate_passes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  pass_type gate_pass_type NOT NULL,
  status gate_pass_status DEFAULT 'pending_faculty',
  reason TEXT NOT NULL,
  leave_date DATE NOT NULL,
  out_time TIME NOT NULL,
  return_date DATE,
  return_time TIME,
  
  -- Approval chain
  faculty_approver_id UUID REFERENCES users(id),
  faculty_approved_at TIMESTAMP WITH TIME ZONE,
  faculty_remarks TEXT,
  
  hod_approver_id UUID REFERENCES users(id),
  hod_approved_at TIMESTAMP WITH TIME ZONE,
  hod_remarks TEXT,
  
  admin_approver_id UUID REFERENCES users(id),
  admin_approved_at TIMESTAMP WITH TIME ZONE,
  admin_remarks TEXT,
  
  -- QR code
  qr_token TEXT UNIQUE,
  qr_generated_at TIMESTAMP WITH TIME ZONE,
  qr_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Scan tracking
  exit_scanned_at TIMESTAMP WITH TIME ZONE,
  exit_scanned_by UUID REFERENCES users(id),
  return_scanned_at TIMESTAMP WITH TIME ZONE,
  return_scanned_by UUID REFERENCES users(id),
  
  -- Alerts
  late_alert_sent BOOLEAN DEFAULT FALSE,
  parent_sms_sent BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

-- Students
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);

-- Faculty
CREATE INDEX IF NOT EXISTS idx_faculty_user ON faculty(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_id_number ON faculty(faculty_id_number);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_posted_by ON notifications(posted_by);
CREATE INDEX IF NOT EXISTS idx_notifications_target_dept ON notifications(target_department_id);
CREATE INDEX IF NOT EXISTS idx_notifications_published ON notifications(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON notification_reads(user_id);

-- Complaints
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_submitted_by ON complaints(submitted_by);
CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned ON complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);

-- Lost & Found
CREATE INDEX IF NOT EXISTS idx_lostfound_type ON lost_found_items(type);
CREATE INDEX IF NOT EXISTS idx_lostfound_status ON lost_found_items(status);
CREATE INDEX IF NOT EXISTS idx_lostfound_reported_by ON lost_found_items(reported_by);

-- Resources & Bookings
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_department ON resources(department_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(booked_by);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_time ON bookings(start_time, end_time);

-- Gate Passes
CREATE INDEX IF NOT EXISTS idx_gatepasses_user ON gate_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_gatepasses_status ON gate_passes(status);
CREATE INDEX IF NOT EXISTS idx_gatepasses_date ON gate_passes(leave_date);
CREATE INDEX IF NOT EXISTS idx_gatepasses_qr ON gate_passes(qr_token);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_update_%I ON %I;
      CREATE TRIGGER trigger_update_%I
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;
`;

async function migrate() {
  console.log('🚀 Running database migration...');
  try {
    await pool.query(migrationSQL);
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  migrate().catch(() => process.exit(1));
}

module.exports = { migrate };
