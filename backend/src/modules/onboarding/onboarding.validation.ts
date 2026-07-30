import { z } from 'zod';

export const educationItemSchema = z.object({
  qualification: z.string().min(1, 'Qualification is required'),
  fieldOfStudy: z.string().min(1, 'Field of study is required'),
  specialization: z.string().min(1, 'Specialization is required'),
  instituteName: z.string().min(1, 'Institute name is required'),
  honors: z.string().optional().nullable(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().nullable(),
  currentlyOngoing: z.boolean().default(false),
});

export const addressHistoryItemSchema = z.object({
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  fromDate: z.string().min(1, 'From Date is required'),
  toDate: z.string().min(1, 'To Date is required'),
});

export const createOnboardingSchema = z.object({
  fullName: z.string().min(2, 'Full Name must be at least 2 characters'),
  gender: z.string().min(1, 'Gender is required'),
  email: z.string().email('Provide a valid email address'),
  phone: z.string().min(7, 'Phone number is too short'),
  dateOfBirth: z.string().min(10, 'Provide DOB in DD/MM/YYYY format'),
  education: z.array(educationItemSchema).min(1, 'Provide at least one educational entry'),
  technology: z.string().min(1, 'Technology track is required'),
  skills: z.string().min(1, 'Skills details are required'),
  visaStatus: z.string().min(1, 'Visa Status is required'),
  entryToUS: z.string().optional().nullable(),
  currentLocation: z.string().min(1, 'Current Location is required'),
  addressHistory: z.array(addressHistoryItemSchema).optional().default([]),
  hasExperience: z.boolean().default(false),
  experienceDetails: z.string().optional().nullable(),
  certifications: z.string().optional().nullable(),
  resumeUrl: z.string().optional().nullable(),
  resumeFileName: z.string().optional().nullable(),
  declared: z.boolean().refine((val) => val === true, 'You must agree to the declaration'),
  planSelected: z.string().min(1, 'Select a plan'),
  amountPaid: z.number().min(0, 'Amount paid cannot be negative'),
  paymentRef: z.string().min(1, 'Payment Reference / Transaction ID is required'),
});

export const onboardingIdParamSchema = z.object({
  id: z.string().uuid('Invalid onboarding ID'),
});

export const updateOnboardingStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
});

export type CreateOnboardingInput = z.infer<typeof createOnboardingSchema>;
export type UpdateOnboardingStatusInput = z.infer<typeof updateOnboardingStatusSchema>;
