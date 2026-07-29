import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, UserCircle, Sparkles, MapPin, Briefcase, Building2, Link as LinkIcon, Palette, Hash, Tag, Award, Calendar, Edit3 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiClient, extractErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { ApiSuccess, User } from '@/types';
import { motion } from 'framer-motion';
import { Reveal } from '@/components/motion/reveal';
import { getRoleLabel } from '@/lib/permissions';

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
  bio: z.string().max(1000).optional(),
  department: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  employeeId: z.string().max(50).optional(),
  shiftPreference: z.string().max(50).optional(),
  linkedInUrl: z.string().url('Invalid URL').max(500).optional().or(z.literal('')),
  displayColor: z.string().max(20).optional(),
  skills: z.string().max(200).optional(), // comma-separated input
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
  const { isAdmin } = usePermissions();
  const [isEditingPremium, setIsEditingPremium] = useState(false);

  const profileForm = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const securityForm = useForm<SecurityForm>({ resolver: zodResolver(securitySchema) });

  useEffect(() => {
    if (!user) return;
    profileForm.reset({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      bio: user.bio ?? '',
      department: user.department ?? '',
      location: user.location ?? '',
      designation: user.designation ?? '',
      employeeId: user.employeeId ?? '',
      shiftPreference: user.shiftPreference ?? '',
      linkedInUrl: user.linkedInUrl ?? '',
      displayColor: user.displayColor ?? '',
      skills: user.skills?.join(', ') ?? '',
    });
    securityForm.reset({ securityQuestion: user.securityQuestion ?? '', securityAnswer: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateProfile = async (values: ProfileForm) => {
    try {
      const payload: any = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        bio: values.bio,
        department: values.department,
        location: values.location,
        designation: values.designation,
        employeeId: values.employeeId,
        shiftPreference: values.shiftPreference,
        linkedInUrl: values.linkedInUrl || null,
        displayColor: values.displayColor,
        skills: values.skills ? values.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      };
      const { data } = await apiClient.patch<ApiSuccess<User>>('/auth/profile', payload);
      setCurrentUser(data.data);
      toast.success('Profile updated successfully');
      setIsEditingPremium(false);
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
    <div className="space-y-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/60 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/20 dark:from-slate-900 dark:via-slate-850/50 dark:to-slate-900 p-[1px]">
          <div className="rounded-[19px] bg-white dark:bg-slate-900">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="relative">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg"
                    style={{ background: user?.displayColor || 'linear-gradient(135deg, #6366f1, #8b5cf6)' , backgroundColor: user?.displayColor || undefined }}
                  >
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{user?.name}</h1>
                    <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-semibold">
                      <Award className="h-3 w-3 mr-1" />
                      {user ? getRoleLabel(user.role) : ''}
                    </Badge>
                    {user?.designation && (
                      <Badge variant="secondary" className="font-medium dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {user.designation}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user?.email} • {user?.phone || 'No phone'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {user?.department && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <Building2 className="h-3 w-3" /> {user.department}
                      </span>
                    )}
                    {user?.location && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <MapPin className="h-3 w-3" /> {user.location}
                      </span>
                    )}
                    {user?.employeeId && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <Hash className="h-3 w-3" /> {user.employeeId}
                      </span>
                    )}
                    {user?.skills && user.skills.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        <Tag className="h-3 w-3" /> {user.skills.slice(0, 3).join(', ')}{user.skills.length > 3 ? ` +${user.skills.length - 3}` : ''}
                      </span>
                    )}
                  </div>
                  {user?.bio && <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-2xl">{user.bio}</p>}
                </div>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsEditingPremium(!isEditingPremium)}>
                  <Edit3 className="h-3.5 w-3.5" /> {isEditingPremium ? 'Cancel' : 'Edit Profile'}
                </Button>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-indigo-500 to-teal-500" />
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Reveal delay={0.05}>
          <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-850 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-base dark:text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  <UserCircle className="h-4 w-4" />
                </div>
                Profile Details
                {/* <Badge variant="outline" className="ml-auto text-[10px] font-semibold border-violet-200 text-violet-700 bg-violet-50">
                  <Sparkles className="h-3 w-3 mr-1" /> Extended
                </Badge> */}
              </CardTitle>
              <CardDescription>Enhanced fields for better team visibility • Role aware</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={profileForm.handleSubmit(updateProfile, (errors) => {
                console.error('Profile form errors:', errors);
                toast.error(`Please fix validation errors: ${Object.entries(errors).map(([key, err]: any) => `${key}: ${err.message}`).join(', ')}`);
              })} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...profileForm.register('name')} className="bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    {profileForm.formState.errors.name && <p className="text-xs text-red-600">{profileForm.formState.errors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Work Email</Label>
                    <Input id="email" type="email" {...profileForm.register('email')} className="bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    {profileForm.formState.errors.email && <p className="text-xs text-red-600">{profileForm.formState.errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Mobile</Label>
                    <Input id="phone" placeholder="+91 98765 43210" {...profileForm.register('phone')} className="bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="employeeId" placeholder="MZ-001" className="pl-9 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" {...profileForm.register('employeeId')} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio">Bio / About</Label>
                  <Textarea id="bio" placeholder="Short intro about you, your expertise..." rows={3} {...profileForm.register('bio')} className="bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="designation">Designation</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="designation" placeholder="Senior Recruiter" className="pl-9 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" {...profileForm.register('designation')} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="department">Department</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="department" placeholder="Talent Acquisition" className="pl-9 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" {...profileForm.register('department')} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="location" placeholder="Pune, Remote, etc." className="pl-9 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" {...profileForm.register('location')} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="shiftPreference">Shift Preference</Label>
                    <Select value={profileForm.watch('shiftPreference') || ''} onValueChange={(v) => profileForm.setValue('shiftPreference', v)}>
                      <SelectTrigger className="bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIGHT">Night (IST 6PM-9AM)</SelectItem>
                        <SelectItem value="FLEXI">Flexi</SelectItem>
                        <SelectItem value="DAY">Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="linkedInUrl">LinkedIn URL</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="linkedInUrl" placeholder="https://linkedin.com/in/..." className="pl-9 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" {...profileForm.register('linkedInUrl')} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="displayColor">Avatar Color</Label>
                    <div className="relative flex items-center">
                      <Palette className="absolute left-3 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                      <Input id="displayColor" placeholder="#6366f1 (Hex Color)" className="pl-9 pr-12 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" {...profileForm.register('displayColor')} />
                      
                      <div className="absolute right-2.5 flex items-center">
                        <div className="relative h-6 w-6 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                          <input
                            type="color"
                            value={profileForm.watch('displayColor') || '#2a5da8'}
                            onChange={(e) => profileForm.setValue('displayColor', e.target.value, { shouldDirty: true, shouldValidate: true })}
                            className="absolute inset-0 h-[200%] w-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer p-0 border-0 bg-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="skills">Skills (comma separated)</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input id="skills" placeholder="Sourcing, Screening, ATS, Boolean Search" className="pl-9 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" {...profileForm.register('skills')} />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Used for team skill matrix & profile badge</p>
                </div>

                <div className="rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border border-violet-100 dark:border-violet-900/30 px-3 py-2.5 flex items-center gap-2 text-xs text-violet-800 dark:text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Role: <span className="font-semibold">{user?.role}</span> • These fields help Admin/TL to better allocate profiles and monitor.
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" variant="brand" disabled={profileForm.formState.isSubmitting} className="gap-2 shadow-md">
                    {profileForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Profile
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => profileForm.reset()}>
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Reveal>

        <div className="space-y-6">
          <Reveal delay={0.1}>
            <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-white dark:from-slate-850 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2 text-base dark:text-white">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  Security & Recovery
                </CardTitle>
                <CardDescription className='dark:text-slate-400'>Security question used for forgot password flow</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={securityForm.handleSubmit(saveSecurityQuestion)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Question</Label>
                    <Select value={securityForm.watch('securityQuestion')} onValueChange={(value) => securityForm.setValue('securityQuestion', value, { shouldValidate: true })}>
                      <SelectTrigger className="bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                        <SelectValue placeholder="Select a security question" />
                      </SelectTrigger>
                      <SelectContent>
                        {securityQuestions.map((question) => (
                          <SelectItem key={question} value={question}>
                            {question}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {securityForm.formState.errors.securityQuestion && <p className="text-xs text-red-600">{securityForm.formState.errors.securityQuestion.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="securityAnswer">Answer</Label>
                    <Input id="securityAnswer" type="password" placeholder="Enter answer" {...securityForm.register('securityAnswer')} className="bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    {securityForm.formState.errors.securityAnswer && <p className="text-xs text-red-600">{securityForm.formState.errors.securityAnswer.message}</p>}
                  </div>
                  <Button type="submit" variant="brand" disabled={securityForm.formState.isSubmitting} className="w-full sm:w-auto">
                    {securityForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Security Question
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.15}>
            <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-850 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2 text-base dark:text-white">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  Change Password
                </CardTitle>
                <CardDescription>Update password • All sessions will be revoked</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" {...passwordForm.register('currentPassword')} className="bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    {passwordForm.formState.errors.currentPassword && <p className="text-xs text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" {...passwordForm.register('newPassword')} className="bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                      {passwordForm.formState.errors.newPassword && <p className="text-xs text-red-600">{passwordForm.formState.errors.newPassword.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" {...passwordForm.register('confirmPassword')} className="bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                      {passwordForm.formState.errors.confirmPassword && <p className="text-xs text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>}
                    </div>
                  </div>
                  <Button type="submit" variant="brand" disabled={passwordForm.formState.isSubmitting} className="gap-2">
                    {passwordForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Change Password & Re-login
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
