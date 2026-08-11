import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingCube } from '@/components/shared/floating-cube';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-6 md:p-12 overflow-hidden flex flex-col items-center">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-0 w-32 h-64 bg-slate-100/40 dark:bg-slate-800/10 rounded-r-full pointer-events-none border border-slate-200/20 dark:border-slate-800/10 border-l-0" />
      <div className="absolute bottom-12 right-12 w-24 h-24 rounded-full border border-slate-100 dark:border-slate-800/30 pointer-events-none" />

      {/* Floating premium cubes */}
      <FloatingCube size={100} top="8%" right="10%" variant="blue" duration={12} />
      <FloatingCube size={60} bottom="10%" left="8%" variant="green" duration={9} delay={1} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-8 md:p-10 shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="h-1.5 w-full bg-mayzax-gradient absolute top-0 left-0" />
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-xs font-semibold text-slate-500 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-400 gap-1.5 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-sm"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-450">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Privacy &amp; Security</span>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-8">Last updated: August 2026</p>

        <div className="space-y-6 text-sm text-slate-650 dark:text-slate-350 leading-relaxed max-h-[550px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-500">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Introduction</h2>
            <p>
              At Mayzax Solutions LLC, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our career placement and training services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Information We Collect</h2>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Personal Information</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Name, email address, and phone number</li>
                <li>Resume, work experience, and educational background</li>
                <li>Professional skills and certifications</li>
                <li>Career goals and preferences</li>
                <li>Communication history with our team</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Technical Information</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>IP address and browser type</li>
                <li>Device information and operating system</li>
                <li>Website usage data and analytics</li>
                <li>Cookies and tracking technologies</li>
              </ul>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Career Placement:</strong> Matching you with suitable job opportunities</li>
              <li><strong>Training Services:</strong> Providing personalized career coaching and training</li>
              <li><strong>Communication:</strong> Sending updates about job applications and services</li>
              <li><strong>Improvement:</strong> Enhancing our services based on feedback</li>
              <li><strong>Marketing:</strong> Sending promotional materials (with your consent)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Information Sharing</h2>
            <p>We may share your information with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Partner Companies:</strong> When applying for job opportunities</li>
              <li><strong>Service Providers:</strong> Third-party services that help us operate</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p>We will never sell your personal information to third parties.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your personal information, including encryption, secure servers, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access and review your personal information</li>
              <li>Request corrections to your data</li>
              <li>Delete your account and associated data</li>
              <li>Opt-out of marketing communications</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">SMS Communications</h2>
            <p>
              By providing your phone number and consenting to SMS communications, you agree to receive text messages from Mayzax Solutions LLC regarding your career placement services, interview schedules, and important updates. Message and data rates may apply. You can opt-out at any time by replying &quot;STOP&quot; to any message.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Cookies Policy</h2>
            <p>
              We use cookies and similar tracking technologies to improve your browsing experience, analyze website traffic, and personalize content. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Contact Us</h2>
            <p>If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-1">
              <p className="font-bold text-emerald-600 dark:text-emerald-450">Mayzax Solutions LLC</p>
              <p><strong>Email:</strong> info@mayzaxsolutions.com</p>
              <p><strong>Phone:</strong> +1 (302) 496-0198</p>
              <p><strong>Address:</strong> 8 THE GREEN, STE B, Dover DE 19901</p>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
