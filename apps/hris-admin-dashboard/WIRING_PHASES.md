# Backend → Frontend Wiring Phase Plan
# HRIS Admin Dashboard

> **Purpose:** Step-by-step guide for wiring each Supabase migration to the React frontend.
> Each phase: read migration schema → create/update service → create/update hook → update page(s) to replace mock data.
> STOP after each phase, report, and wait for "Yes Proceed" before continuing.

---

## Phase Status Legend
- ✅ Complete
- 🔄 In Progress
- ⬜ Not Started
- ⚠️ Needs manual action (e.g. run SQL in Supabase)

---

## PHASE 1 — Auth & Organizations ✅
**Migrations:** 001_organizations_and_auth, 002_rls_policies, 003_seed_system_data, 004_landing_page_leads
**Status:** COMPLETE

### Files Wired
| File | Change |
|---|---|
| `src/pages/auth/LoginPage.tsx` | `supabase.auth.signInWithPassword()` + mock fallback |
| `src/pages/auth/SignUpPage.tsx` | `supabase.auth.signUp()` with metadata, email confirmation handling |
| `src/pages/auth/CompanySetupPage.tsx` | `supabase.rpc('create_organization')` SECURITY DEFINER |
| `src/pages/auth/TenantSelectorPage.tsx` | `getUserOrganizations()` via React Query, auto-redirect |
| `src/pages/auth/ForgotPasswordPage.tsx` | `supabase.auth.resetPasswordForEmail()` |
| `src/pages/auth/AuthCallbackPage.tsx` | Email confirmation, profile creation for new users |
| `src/App.tsx` | `SupabaseSessionSync` for cross-app SSO |
| `src/services/organizations.ts` | `createOrganization()` via RPC, `getUserOrganizations()` |
| `supabase-rls-fix.sql` | RLS policies + SECURITY DEFINER function — **run in Supabase SQL Editor** |

### ⚠️ Required Manual Action
Run `supabase-rls-fix.sql` in Supabase → SQL Editor before any other phase will work.

---

## PHASE 2 — Employee Database ⬜
**Migration:** 005_employee_database
**Key Tables:** `employees`, `departments`, `positions`, `employment_types`, `employee_employment`, `employee_compensation`, `employee_government_ids`, `employee_bank_accounts`, `employee_emergency_contacts`, `employee_dependents`, `employee_beneficiaries`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/employees.ts` | Enhance: full CRUD (getEmployees, getEmployee, updateEmployee, deleteEmployee, getEmployeeStats) |
| `src/services/addEmployee.ts` | Enhance: map multi-step form fields to correct DB columns |
| `src/hooks/useEmployees.ts` | Enhance: add `useEmployee(id)`, `useCreateEmployee()`, `useUpdateEmployee()`, `useDeleteEmployee()` mutations |
| `src/pages/employees/EmployeeListPage.tsx` | Replace mock data → `useEmployees()` hook |
| `src/pages/employees/EmployeeProfilePage.tsx` | Replace mock data → `useEmployee(id)` hook |
| `src/pages/employees/NewEmployeePage.tsx` | Replace mock submit → `useCreateEmployee()` mutation |
| `src/pages/employees/EditEmployeePage.tsx` | Replace mock data → `useEmployee(id)` + `useUpdateEmployee()` |
| `src/pages/employees/BulkUploadPage.tsx` | Wire CSV parse → `addEmployee()` batch insert |
| `src/pages/employees/OrgChartPage.tsx` | Replace mock → query departments + employee_employment hierarchy |

### Mock files being replaced
- `src/data/mock/employees.json`
- `src/data/mock/employee-details.json`

---

## PHASE 3 — Onboarding & Offboarding ⬜
**Migration:** 006_onboarding_offboarding
**Key Tables:** `onboarding_workflows`, `onboarding_tasks`, `onboarding_progress`, `offboarding_checklists`, `clearance_items`, `offboarding_records`, `clearance_progress`, `exit_interviews`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/onboarding.ts` | CREATE: `getOnboardingRecords()`, `getOnboardingDetail()`, `updateTaskStatus()` |
| `src/services/offboarding.ts` | CREATE: `getOffboardingRecords()`, `getOffboardingDetail()`, `updateClearanceStatus()` |
| `src/hooks/useOnboarding.ts` | CREATE: React Query wrappers with mock fallback |
| `src/pages/onboarding/OnboardingPage.tsx` | Replace mock → `useOnboarding()` hook |
| `src/pages/onboarding/OnboardingDetailPage.tsx` | Replace mock → `useOnboardingDetail(id)` hook |
| `src/pages/offboarding/OffboardingPage.tsx` | Replace mock → `useOffboarding()` hook |
| `src/pages/offboarding/OffboardingDetailPage.tsx` | Replace mock → `useOffboardingDetail(id)` hook |

### Mock files being replaced
- `src/data/mock/onboarding.json`
- `src/data/mock/offboarding.json`

---

## PHASE 4 — Attendance ⬜
**Migration:** 007_attendance
**Key Tables:** `schedules`, `employee_schedules`, `holidays`, `attendance_logs`, `overtime_requests`, `attendance_corrections`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/attendance.ts` | CREATE: `getAttendanceLogs()`, `getOvertime()`, `getShifts()`, `getHolidays()`, `approveOvertime()` |
| `src/hooks/useAttendance.ts` | CREATE: React Query wrappers for each tab |
| `src/pages/attendance/AttendancePage.tsx` | Replace mock → hooks (daily, calendar, reports, overtime, shifts, holidays tabs) |

### Mock files being replaced
- `src/data/mock/attendance-logs.json`
- `src/data/mock/overtime-requests.json`
- `src/data/mock/shifts.json`
- `src/data/mock/shift-assignments.json`
- `src/data/mock/ph-holidays.json`

---

## PHASE 5 — Leave Management ⬜
**Migration:** 008_leave_management
**Key Tables:** `leave_types`, `leave_policies`, `leave_balances`, `leave_requests`, `leave_approvals`, `leave_credits_history`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/leaves.ts` | EXISTS — enhance: add `applyLeave()`, `approveLeave()`, `rejectLeave()`, `cancelLeave()` mutations |
| `src/hooks/useLeaves.ts` | CREATE: `useLeaveRequests()`, `useLeaveBalances()`, `useLeaveTypes()`, `useApplyLeave()`, `useApproveLeave()` |
| `src/pages/leaves/LeavesPage.tsx` | Replace mock → hooks (requests, balances, calendar, types, reports tabs) |

### Mock files being replaced
- `src/data/mock/leave-requests.json`
- `src/data/mock/leave-balances.json`
- `src/data/mock/leave-types.json`

---

## PHASE 6 — Payroll Engine ⬜
**Migration:** 009_payroll
**Key Tables:** `payroll_periods`, `payroll_runs`, `payslips`, `payroll_items`, `salary_adjustments`, `loans`, `loan_amortization`, `thirteenth_month_pay`, `payroll_disputes`
**DB Functions:** `compute_sss()`, `compute_philhealth()`, `compute_pagibig()`, `compute_withholding_tax()`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/payroll.ts` | CREATE: `getPayrollRuns()`, `getPayslips()`, `getPayrollDisputes()`, `approvePayrollRun()`, `getLoans()` |
| `src/hooks/usePayroll.ts` | CREATE: React Query wrappers for each tab |
| `src/pages/payroll/PayrollPage.tsx` | Replace mock → hooks (runs, register, payslip, reports, disputes, ai-audit tabs) |

### Mock files being replaced
- `src/data/mock/payroll-runs.json`
- `src/data/mock/payroll-records.json`
- `src/data/mock/payroll-disputes.json`

---

## PHASE 7 — Benefits & Loans ⬜
**Migration:** 010_benefits
**Key Tables:** `benefits`, `hmo_plans`, `employee_benefits`, `hmo_dependents`, `loan_applications`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/benefits.ts` | CREATE: `getBenefits()`, `getHmoPlans()`, `getEmployeeBenefits()`, `getLoans()`, `getLoanApplications()` |
| `src/hooks/useBenefits.ts` | CREATE: React Query wrappers with mock fallback |
| `src/pages/benefits/BenefitsPage.tsx` | Replace mock → hooks |

### Mock files being replaced
- `src/data/mock/benefits-enrollments.json`
- `src/data/mock/benefits-hmo-plans.json`
- `src/data/mock/benefits-loans.json`
- `src/data/mock/benefits-dependents.json`

---

## PHASE 8 — Expenses ⬜
**Migration:** 011_expenses
**Key Tables:** `expense_claims`, `expense_categories`, `receipts`, `expense_approvals`, `reimbursements`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/expenses.ts` | CREATE: `getExpenseClaims()`, `getExpenseCategories()`, `approveExpense()`, `submitExpenseClaim()` |
| `src/hooks/useExpenses.ts` | CREATE: React Query wrappers with mock fallback |
| `src/pages/expenses/ExpensesPage.tsx` | Replace mock → hooks |

### Mock files being replaced
- `src/data/mock/expenses-claims.json`
- `src/data/mock/expenses-categories.json`
- `src/data/mock/expenses-company.json`
- `src/data/mock/expenses-budgets.json`

---

## PHASE 9 — Documents ⬜
**Migration:** 012_documents
**Key Tables:** `documents`, `document_categories`, `document_versions`, `document_access_logs`, `document_shares`, `e_signatures`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/documents.ts` | CREATE: `getDocuments()`, `getDocumentCategories()`, `uploadDocument()`, `shareDocument()` |
| `src/hooks/useDocuments.ts` | CREATE: React Query wrappers with mock fallback |
| `src/pages/documents/DocumentsPage.tsx` | Replace mock → hooks |

### Mock files being replaced
- `src/data/mock/documents-library.json`
- `src/data/mock/documents-categories.json`
- `src/data/mock/documents-versions.json`

---

## PHASE 10 — Performance ⬜
**Migration:** 013_performance
**Key Tables:** `review_cycles`, `employee_reviews`, `review_criteria`, `review_scores`, `review_templates`, `employee_goals`, `improvement_plans`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/performance.ts` | CREATE: `getReviewCycles()`, `getReviews()`, `getGoals()`, `submitReview()` |
| `src/hooks/usePerformance.ts` | CREATE: React Query wrappers with mock fallback |
| `src/pages/performance/PerformancePage.tsx` | Replace mock → hooks |

### Mock files being replaced
- `src/data/mock/performance-cycles.json`
- `src/data/mock/performance-reviews.json`
- `src/data/mock/performance-goals.json`
- `src/data/mock/performance-feedback.json`

---

## PHASE 11 — Compliance & Reports ⬜
**Migration:** 014_compliance
**Key Tables:** `compliance_reports`, `bir_alphalist_records`, `sss_records`, `philhealth_records`, `pagibig_records`, `compliance_remittances`, `compliance_deadlines`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/compliance.ts` | CREATE: `getComplianceReports()`, `getComplianceDeadlines()`, `getRemittances()` |
| `src/hooks/useCompliance.ts` | CREATE: React Query wrappers with mock fallback |
| `src/pages/compliance/CompliancePage.tsx` | Replace mock → hooks |

### Mock files being replaced
- `src/data/mock/compliance-reports.json`
- `src/data/mock/compliance-audit-logs.json`
- `src/data/mock/compliance-dole.json`
- `src/data/mock/compliance-dpa.json`
- `src/data/mock/compliance-custom-reports.json`

---

## PHASE 12 — Recruitment ⬜
**Migration:** 015_recruitment
**Key Tables:** `job_postings`, `applicants`, `interviews`, `interview_interviewers`, `job_offers`, `applicant_notes`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/recruitment.ts` | CREATE: `getJobPostings()`, `getApplicants()`, `getInterviews()`, `getOffers()`, `updateApplicantStatus()` |
| `src/hooks/useRecruitment.ts` | CREATE: React Query wrappers with mock fallback |
| `src/pages/recruitment/RecruitmentPage.tsx` | Replace mock → hooks |

### Mock files being replaced
- `src/data/mock/recruitment-jobs.json`
- `src/data/mock/recruitment-applicants.json`
- `src/data/mock/recruitment-interviews.json`
- `src/data/mock/recruitment-offers.json`
- `src/data/mock/recruitment-pipeline.json`

---

## PHASE 13 — Notifications ⬜
**Migration:** 016_notifications
**Key Tables:** `notifications`, `notification_preferences`, `notification_templates`, `email_queue`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/notifications.ts` | CREATE: `getNotifications()`, `markRead()`, `markAllRead()`, `getPreferences()`, `updatePreferences()` |
| `src/hooks/useNotifications.ts` | CREATE: React Query + Supabase Realtime subscription |
| `src/pages/notifications/NotificationsPage.tsx` | Replace mock → hooks + realtime |

### Mock files being replaced
- `src/data/mock/notifications.json`

---

## PHASE 14 — Dashboard, Analytics & Audit ⬜
**Migrations:** 017_audit, 018_analytics, 019_storage
**Key Tables:** `audit_logs`, `security_events`, `dashboard_snapshots`, `data_retention_policies`

### Files to Create / Update
| File | Action |
|---|---|
| `src/services/analytics.ts` | CREATE: `getDashboardStats()`, `getAnalyticsData()`, `getAuditLogs()` |
| `src/hooks/useAnalytics.ts` | CREATE: React Query wrappers |
| `src/pages/dashboard/DashboardPage.tsx` | Replace mock KPIs → `useAnalytics()` hook (real employee, leave, payroll stats) |
| `src/pages/analytics/AnalyticsPage.tsx` | Replace mock → hooks |

### Mock files being replaced
- `src/data/mock/analytics-dashboards.json`
- `src/data/mock/analytics-insights.json`
- `src/data/mock/activities.json`
- `src/data/mock/pending-approvals.json`
- `src/data/mock/announcements.json`

---

## Rules
1. Never skip reading the migration SQL before writing a service — column names must match exactly
2. Every service function must have a Supabase path AND a mock fallback (check `isSupabaseConfigured`)
3. Every hook uses React Query (`useQuery` / `useMutation`) with `staleTime: 1000 * 60 * 5`
4. Pages replace mock imports with hook calls — do not delete mock files (they remain as fallback source)
5. All Supabase queries must be scoped to `organization_id` via the auth store tenant
6. STOP → REPORT → ASK after each phase
