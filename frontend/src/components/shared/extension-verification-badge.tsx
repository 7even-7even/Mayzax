import { ShieldCheck, XCircle, Download, Puzzle, AlertCircle, ExternalLink, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  if (isChecking || state === 'checking' || state === 'verifying_hash') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 animate-pulse">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        {state === 'verifying_hash' ? 'Securing proof via HMAC...' : 'Verifying via extension v2...'}
      </div>
    );
  }

  if (isVerified && (state === 'verified' || result?.verified)) {
    const score = result?.score ?? result?.confidenceScore ?? 100;
    const portal = result?.portal ?? 'OTHER';
    const ref = result?.applicationReference;
    const hash = result?.verificationHash;
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
              Verified v2
              <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                {score}%
              </span>
              {hash && <span className="ml-1 text-[9px] text-emerald-600/70">• HMAC {hash.slice(0,6)}...</span>}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm text-xs">
            <div className="space-y-1">
              <p className="font-semibold">Enterprise Verified ✓ v2 HMAC Secured</p>
              {result?.company && <p>Company: {result.company}</p>}
              {result?.jobTitle && <p>Role: {result.jobTitle}</p>}
              <p>Portal: {portal}</p>
              {ref && <p>Ref: {ref}</p>}
              {hash && <p className="text-[10px] font-mono">Hash: {hash.slice(0,16)}...</p>}
              <p className="text-[11px] text-slate-400">Reasons: {result?.reasons?.slice(0,3).join(' • ') || result?.matchedRules?.join(', ')}</p>
              <p className="text-[10px] text-emerald-600">Score {score}% • Version {result?.version || 'v2'}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (state === 'fraud_detected' || result?.fraudSignals?.includes('REPLAY_DETECTED') || result?.isReplay) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 border border-red-200">
        <Shield className="h-4 w-4 text-red-600" />
        Fraud Detected
        <span className="text-[10px] text-red-600">• {result?.fraudSignals?.slice(0,2).join(', ') || 'Replay/Invalid'}</span>
        {onRetry && (
          <button onClick={onRetry} className="ml-1 rounded-full p-1 hover:bg-red-100">
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>
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
            <span className="leading-none">Mayzax Verifier v2 not detected</span>
            <span className="text-[11px] font-normal text-amber-700/80 mt-0.5">Install enterprise extension for HMAC-secured verification</span>
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
              Install Extension v2
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
            <span className="font-semibold">Enterprise v1:</span> Auto-detects success on Greenhouse, Lever, Workday, LinkedIn, Indeed + 15 ATS, collects evidence, generates HMAC proof via backend. No keyword bypass.
          </p>
        </div>
      </div>
    );
  }

  if (isExtensionInstalled && (state === 'not_verified' || state === 'idle')) {
    const score = result?.score ?? result?.confidenceScore ?? 0;
    
    const badge = (
      <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 cursor-help">
        <XCircle className="h-4 w-4 text-slate-400" />
        <span>Not verified yet {score > 0 ? `(${score}%)` : ''}</span>
        <span className="text-[10px] text-slate-400">• Apply first, then paste link</span>
        {onRetry && (
          <button onClick={(e) => { e.stopPropagation(); onRetry(); }} className="ml-1 rounded-full p-1 hover:bg-slate-100">
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>
    );

    if (score > 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {badge}
            </TooltipTrigger>
            <TooltipContent className="max-w-sm text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-slate-700">Unverified Application ({score}%)</p>
                {result?.reasons && <p className="text-[11px] text-slate-500">Reasons: {result.reasons.slice(0, 3).join(' • ')}</p>}
                {result?.fraudSignals && result.fraudSignals.length > 0 && (
                  <p className="text-[11px] text-red-500">Signals: {result.fraudSignals.join(', ')}</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badge;
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-100">
      <AlertCircle className="h-4 w-4 text-slate-400" />
      Verification unavailable
      <span className="hidden sm:inline text-[11px] text-slate-400 ml-1">• Use Chrome + extension v2 for HMAC verification</span>
    </div>
  );
}

export function SimpleExtensionVerificationBadge({ isVerified, isChecking }: { isVerified: boolean; isChecking: boolean }) {
  if (isChecking) {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-500 border border-slate-100">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        Verifying v2...
      </div>
    );
  }
  if (isVerified) {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-100/80">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        Verified v2
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
