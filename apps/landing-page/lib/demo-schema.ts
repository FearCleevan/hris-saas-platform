import { z } from 'zod';

export const demoFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  company: z.string().min(2, 'Company name is required'),
  email: z.email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'], {
    error: 'Please select company size',
  }),
  industry: z.enum([
    'Banking & Finance',
    'BPO / IT Services',
    'Food & Beverage',
    'Healthcare',
    'Manufacturing',
    'Real Estate',
    'Retail',
    'Telecommunications',
    'Transportation & Logistics',
    'Other',
  ], { error: 'Please select your industry' }),
  preferredDate: z.string().min(1, 'Please select a preferred demo date'),
  preferredTime: z.enum(
    ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'],
    { error: 'Please select a preferred time' },
  ),
  message: z.string().optional(),
});

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Please enter a valid email address'),
  phone: z.string().optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
  type: z.enum(['general', 'sales', 'support', 'billing', 'partnership'], {
    error: 'Please select an inquiry type',
  }),
});

export type DemoFormData = z.infer<typeof demoFormSchema>;
export type ContactFormData = z.infer<typeof contactFormSchema>;
