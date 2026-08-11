import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingCube } from '@/components/shared/floating-cube';

export default function TermsPage() {
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
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Scale className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Legal Terms</span>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Terms &amp; Conditions</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-8">Last updated: August 2026</p>

        <div className="space-y-6 text-sm text-slate-650 dark:text-slate-350 leading-relaxed max-h-[550px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-500">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Acceptance of Terms</h2>
            <p>
              By accessing and using the services provided by Mayzax Solutions LLC (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Services Provided</h2>
            <p>Mayzax Solutions offers the following services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>IT Career Placement Services</li>
              <li>Professional Training and Coaching</li>
              <li>Resume Writing and Optimization</li>
              <li>Interview Preparation</li>
              <li>Career Analytics and Guidance</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Service Plans &amp; Payments</h2>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Plan Selection</h3>
              <p>We offer three service tiers: Basic, Gold, and Premium. Each plan includes specific services and durations as outlined on our Pricing page.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Payment Terms</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Payment must be made upfront before services commence</li>
                <li>All fees are in USD and non-refundable unless otherwise stated</li>
                <li>Additional services may incur extra charges</li>
                <li>We reserve the right to modify pricing with 30 days notice</li>
              </ul>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Client Responsibilities</h2>
            <p>As a client, you agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide accurate and complete information</li>
              <li>Respond promptly to interview requests and communications</li>
              <li>Actively participate in training and coaching sessions</li>
              <li>Follow our recommendations and guidelines</li>
              <li>Notify us immediately of any job offers or acceptances</li>
              <li>Maintain professional conduct throughout the process</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Service Guarantee</h2>
            <p>While we maintain a 95% interview success rate and work diligently to secure job placements, we cannot guarantee:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Specific job offers or salaries</li>
              <li>Placement at particular companies</li>
              <li>Immediate job placement within a specific timeframe</li>
              <li>Acceptance of applications by hiring companies</li>
            </ul>
            <p>Job placement success depends on various factors including market conditions, your qualifications, and interview performance.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Refund Policy</h2>
            <p><strong>No Refund Policy:</strong> All services are non-refundable once initiated. We commit significant resources and time to each client from day one.</p>
            <p><strong>Cancellation:</strong> You may cancel services at any time, but no refund will be provided for unused services.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Intellectual Property</h2>
            <p>
              All materials provided by Mayzax Solutions, including training content, templates, and resources, remain our intellectual property. You may not reproduce, distribute, or sell these materials without written permission.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Confidentiality</h2>
            <p>
              We will maintain confidentiality of your personal information and career details. However, we will share necessary information with potential employers as part of the job application process with your consent.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Limitation of Liability</h2>
            <p>
              Mayzax Solutions shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our services. Our total liability shall not exceed the amount paid for services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Termination</h2>
            <p>
              We reserve the right to terminate services if you violate these terms, provide false information, or engage in unprofessional conduct. No refund will be provided in case of termination due to violation of terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Governing Law</h2>
            <p>
              These Terms and Conditions shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting on our website. Continued use of our services constitutes acceptance of modified terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Contact Us</h2>
            <p>For questions about these Terms and Conditions, please contact:</p>
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-1">
              <p className="font-bold text-indigo-600 dark:text-indigo-400">Mayzax Solutions LLC</p>
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
