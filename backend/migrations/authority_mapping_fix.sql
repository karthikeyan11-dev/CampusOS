-- Hardening Authority Mapping Relations
-- 1. Class Assignments: Department Link
ALTER TABLE class_assignments 
  ADD CONSTRAINT fk_class_dept 
  FOREIGN KEY (department_id) 
  REFERENCES departments(id) 
  ON DELETE CASCADE;

-- 2. Department Assignments: Department Link (Self-referencing logical bridge)
-- Current department_assignments uses 'dept_name', I'll add 'department_id' for relational integrity
ALTER TABLE department_assignments ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE CASCADE;

-- 3. Student Entity Mapping Indexes
CREATE INDEX IF NOT EXISTS idx_student_hostel ON students(hostel_id);
CREATE INDEX IF NOT EXISTS idx_class_dept ON class_assignments(department_id);

-- Ensure staff_assignments is the primary bridge for Executive Mappings
-- (I created staff_assignments in the previous step, ensuring it's used for HOD/Mentor/Warden audits)
