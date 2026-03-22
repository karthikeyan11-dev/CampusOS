-- Institutional Hierarchy Migration

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Hostels Table
CREATE TABLE IF NOT EXISTS hostels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL, -- e.g., 'BOYS', 'GIRLS'
    capacity INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Staff Assignments (Linking Faculty/Staff to Entities)
CREATE TABLE IF NOT EXISTS staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'DEPARTMENT', 'HOSTEL'
    entity_id UUID NOT NULL,
    assignment_type VARCHAR(50) NOT NULL, -- 'HOD', 'MENTOR', 'WARDEN', 'DEPUTY_WARDEN', 'STAFF'
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, entity_type, entity_id)
);

-- 4. Update Students for Hostel Mapping
ALTER TABLE students ADD COLUMN IF NOT EXISTS hostel_id UUID REFERENCES hostels(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS room_number VARCHAR(20);

-- 5. Seed Initial Entities (Optional but helpful for testing)
INSERT INTO departments (name, code) VALUES 
('Computer Science & Engineering', 'CSE'),
('Electronics & Communication', 'ECE'),
('Mechanical Engineering', 'MECH')
ON CONFLICT DO NOTHING;

INSERT INTO hostels (name, type) VALUES 
('Main Boys Hostel', 'BOYS'),
('Annex Girls Hostel', 'GIRLS')
ON CONFLICT DO NOTHING;
