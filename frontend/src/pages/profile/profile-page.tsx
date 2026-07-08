import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, UserCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient, extractErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { ApiSuccess, User } from '@/types';

const securityQuestions = [
  'What is your pet name?',
  'What is your birth year?',
  'What is your favorite teacher’s name?',
  'What city were you born in?',
  'What is your favorite food?',
];

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().max(30, 'Phone number is too long').optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

const securitySchema = z.object({
  securityQuestion: z.string().min(3, 'Select a security question'),
  securityAnswer: z.string().min(2, 'Security answer is required'),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type SecurityForm = z.infer<typeof securitySchema>;

export default function ProfilePage() {
  const { user, setCurrentUser, logout } = useAuth();

  const profileForm = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const securityForm = useForm<SecurityForm>({ resolver: zodResolver(securitySchema) });

  useEffect(() => {
    if (!user) return;
    profileForm.reset({ name: user.name, email: user.email, phone: user.phone ?? '' });
    securityForm.reset({ securityQuestion: user.securityQuestion ?? '', securityAnswer: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateProfile = async (values: ProfileForm) => {
    try {
      const { data } = await apiClient.patch<ApiSuccess<User>>('/auth/profile', values);
      setCurrentUser(data.data);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update profile'));
    }
  };

  const changePassword = async (values: PasswordForm) => {
    try {
      await apiClient.post('/auth/change-password', values);
      toast.success('Password changed. Please log in again.');
      await logout();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to change password'));
    }
  };

  const saveSecurityQuestion = async (values: SecurityForm) => {
    try {
      const { data } = await apiClient.post<ApiSuccess<User>>('/auth/security-question', values);
      setCurrentUser(data.data);
      securityForm.reset({ securityQuestion: data.data.securityQuestion ?? values.securityQuestion, securityAnswer: '' });
      toast.success('Security question saved successfully');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save security question'));
    }
  };

  return (
    <div>
      <PageHeader title="Profile" description="View and update your account details, password, and account recovery question." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-mayzax-blue" /> Account Details
            </CardTitle>
            <CardDescription>Name, email, and mobile number for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(updateProfile)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...profileForm.register('name')} />
                {profileForm.formState.errors.name && <p className="text-xs text-red-600">{profileForm.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...profileForm.register('email')} />
                {profileForm.formState.errors.email && <p className="text-xs text-red-600">{profileForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile Number</Label>
                <Input id="phone" placeholder="+91 98765 43210" {...profileForm.register('phone')} />
                {profileForm.formState.errors.phone && <p className="text-xs text-red-600">{profileForm.formState.errors.phone.message}</p>}
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Role: <span className="font-medium text-slate-700">{user?.role}</span>
              </div>
              <Button type="submit" variant="brand" disabled={profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Details
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-mayzax-green" /> Security Question
            </CardTitle>
            <CardDescription>Used for forgot password recovery from the login page.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={securityForm.handleSubmit(saveSecurityQuestion)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Question</Label>
                <Select value={securityForm.watch('securityQuestion')} onValueChange={(value) => securityForm.setValue('securityQuestion', value, { shouldValidate: true })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a security question" />
                  </SelectTrigger>
                  <SelectContent>
                    {securityQuestions.map((question) => (
                      <SelectItem key={question} value={question}>{question}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {securityForm.formState.errors.securityQuestion && <p className="text-xs text-red-600">{securityForm.formState.errors.securityQuestion.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="securityAnswer">Answer</Label>
                <Input id="securityAnswer" type="password" placeholder="Enter answer" {...securityForm.register('securityAnswer')} />
                {securityForm.formState.errors.securityAnswer && <p className="text-xs text-red-600">{securityForm.formState.errors.securityAnswer.message}</p>}
              </div>
              <Button type="submit" variant="brand" disabled={securityForm.formState.isSubmitting}>
                {securityForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Security Question
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Verify your current password, then enter and confirm the new password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(changePassword)} className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" {...passwordForm.register('currentPassword')} />
                {passwordForm.formState.errors.currentPassword && <p className="text-xs text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" {...passwordForm.register('newPassword')} />
                {passwordForm.formState.errors.newPassword && <p className="text-xs text-red-600">{passwordForm.formState.errors.newPassword.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" {...passwordForm.register('confirmPassword')} />
                {passwordForm.formState.errors.confirmPassword && <p className="text-xs text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>}
              </div>
              <div className="md:col-span-3">
                <Button type="submit" variant="brand" disabled={passwordForm.formState.isSubmitting}>
                  {passwordForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Change Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
