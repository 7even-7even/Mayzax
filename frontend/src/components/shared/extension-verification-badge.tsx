import { ShieldCheck, XCircle, Download, Puzzle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ExtensionVerificationResult, ExtensionState } from '@/hooks/use-extension-verification';
import { motion } from 'framer-motion';

interface Props {
  isVerified: boolean;
  isChecking: boolean;
  result: ExtensionVerificationResult | null;
  state?: ExtensionState;
  isExtensionInstalled?: boolean;
  installUrl?: string | null;
  onRetry?: () => void;
  extensionId?: string;
}

export function ExtensionVerificationBadge({
  isVerified,
  isChecking,
  result,
  state = 'idle',
  isExtensionInstalled = false,
  installUrl,
  onRetry,
}: Props) {
  if (isChecking || state === 'checking') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 animate-pulse">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        Verifying via extension...
      </div>
    );
  }

  if (isVerified && (state === 'verified' || result?.verified)) {
    const confidence = result?.confidenceScore ?? 100;
    const portal = result?.portal ?? 'OTHER';
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200/60 shadow-sm cursor-help"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Verified
              <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                {confidence}%
              </span>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <div className="space-y-1">
              <p className="font-semibold">Extension Verified ✓</p>
              {result?.company && <p>Company: {result.company}</p>}
              {result?.jobTitle && <p>Role: {result.jobTitle}</p>}
              <p>Portal: {portal}</p>
              <p className="text-[11px] text-slate-400">Matched rules: {result?.matchedRules?.join(', ') || 'URL heuristic'}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (state === 'not_installed') {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
            <Puzzle className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="leading-none">Mayzax Verifier not detected</span>
            <span className="text-[11px] font-normal text-amber-700/80 mt-0.5">Install our extension to auto-verify applications</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {installUrl ? (
            <a
              href={installUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Install Extension
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          ) : (
            <span className="text-[11px] text-amber-700">Extension ID not configured. Set VITE_EXTENSION_ID.</span>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-50 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          )}
        </div>

        <div className="rounded-lg bg-white/70 border border-amber-100 p-2">
          <p className="text-[11px] leading-snug text-slate-600">
            <span className="font-semibold">How to verify:</span> After installing, open a job portal (LinkedIn, Indeed, etc.) and apply. The extension will auto-detect success and mark this link as verified when you paste it back here.
          </p>
        </div>
      </div>
    );
  }

  // not_verified but extension is installed
  if (isExtensionInstalled && state === 'not_verified') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200">
        <XCircle className="h-4 w-4 text-slate-400" />
        <span>Not verified yet</span>
        <span className="text-[10px] text-slate-400">• Apply first, then paste link</span>
        {onRetry && (
          <button onClick={onRetry} className="ml-1 rounded-full p-1 hover:bg-slate-100">
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  // default fallback - chrome runtime not available (e.g. Firefox or normal browser)
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-100">
      <AlertCircle className="h-4 w-4 text-slate-400" />
      Verification unavailable
      <span className="hidden sm:inline text-[11px] text-slate-400 ml-1">• Use Chrome + extension for auto-verification</span>
    </div>
  );
}

// Legacy simple wrapper kept for backward compat - richer version above is preferred
export function SimpleExtensionVerificationBadge({ isVerified, isChecking }: { isVerified: boolean; isChecking: boolean }) {
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
