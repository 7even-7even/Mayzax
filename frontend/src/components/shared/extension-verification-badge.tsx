import { ShieldCheck, XCircle } from 'lucide-react';
import { ExtensionVerificationResult } from '@/hooks/use-extension-verification';

interface Props {
  isVerified: boolean;
  isChecking: boolean;
  result: ExtensionVerificationResult | null;
}

export function ExtensionVerificationBadge({ isVerified, isChecking }: Props) {
  if (isChecking) {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-500 border border-slate-100">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        Verifying...
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-100/80">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        Verified
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-500 border border-slate-100">
      <XCircle className="h-4 w-4 text-slate-400" />
      Unable to verify
    </div>
  );
}
