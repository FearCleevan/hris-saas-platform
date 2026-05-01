export interface EmployeeUser {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'team_lead';
  employeeId: string;
  department: string;
  position: string;
  mustChangePassword: boolean;
  darkMode: boolean;
}
