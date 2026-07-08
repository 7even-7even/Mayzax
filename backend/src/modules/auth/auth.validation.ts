import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().email('A valid email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120).optional(),
  email: z.string().email('A valid email is required').optional(),
  phone: z.string().trim().max(30, 'Phone number must be 30 characters or less').optional().or(z.literal('')),
});

export const securityQuestionSchema = z.object({
  securityQuestion: z.string().min(3, 'Security question is required').max(200),
  securityAnswer: z.string().min(2, 'Security answer is required').max(200),
});

export const forgotPasswordQuestionSchema = z.object({
  email: z.string().email('A valid email is required'),
});

export const forgotPasswordResetSchema = z
  .object({
    email: z.string().email('A valid email is required'),
    securityAnswer: z.string().min(1, 'Security answer is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SecurityQuestionInput = z.infer<typeof securityQuestionSchema>;
export type ForgotPasswordQuestionInput = z.infer<typeof forgotPasswordQuestionSchema>;
export type ForgotPasswordResetInput = z.infer<typeof forgotPasswordResetSchema>;
