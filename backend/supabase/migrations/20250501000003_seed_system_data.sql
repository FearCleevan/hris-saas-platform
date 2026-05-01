-- ══════════════════════════════════════════════════════════════════
-- Migration: Seed System Permissions
-- Phase 1 — Base permission catalogue
-- ══════════════════════════════════════════════════════════════════

INSERT INTO public.permissions (module, action, description) VALUES
  -- Employees
  ('employees', 'view',            'View employee list and profiles'),
  ('employees', 'create',          'Add new employees'),
  ('employees', 'edit',            'Edit employee information'),
  ('employees', 'delete',          'Deactivate/delete employees'),
  ('employees', 'export',          'Export employee data'),
  -- Attendance
  ('attendance', 'view',           'View attendance records'),
  ('attendance', 'approve',        'Approve corrections and OT'),
  ('attendance', 'export',         'Export attendance reports'),
  -- Leaves
  ('leaves', 'view',               'View leave requests'),
  ('leaves', 'approve',            'Approve or reject leave requests'),
  ('leaves', 'manage_balances',    'Adjust leave balances'),
  -- Payroll
  ('payroll', 'view',              'View payroll runs'),
  ('payroll', 'run',               'Execute payroll computation'),
  ('payroll', 'approve',           'Approve and release payroll'),
  ('payroll', 'export',            'Export bank files and payslips'),
  -- Benefits
  ('benefits', 'view',             'View benefits and HMO'),
  ('benefits', 'manage',           'Enroll and update benefits'),
  -- Expenses
  ('expenses', 'view',             'View expense claims'),
  ('expenses', 'approve',          'Approve reimbursements'),
  -- Documents
  ('documents', 'view',            'View company documents'),
  ('documents', 'manage',          'Upload and manage documents'),
  -- Performance
  ('performance', 'view',          'View performance reviews'),
  ('performance', 'manage',        'Manage review cycles'),
  -- Recruitment
  ('recruitment', 'view',          'View job postings and applicants'),
  ('recruitment', 'manage',        'Post jobs and manage pipeline'),
  -- Reports
  ('reports', 'view',              'View analytics and reports'),
  ('reports', 'compliance',        'Generate BIR/SSS/PhilHealth reports'),
  -- Settings
  ('settings', 'view',             'View system settings'),
  ('settings', 'manage',           'Modify system settings'),
  -- Users & Roles
  ('users', 'view',                'View user accounts'),
  ('users', 'invite',              'Invite new users'),
  ('users', 'manage_roles',        'Assign and manage roles')
ON CONFLICT (module, action) DO NOTHING;
