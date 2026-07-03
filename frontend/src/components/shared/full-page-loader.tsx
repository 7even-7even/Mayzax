import { Loader2 } from 'lucide-react';

export function FullPageLoader({ label = 'Loading Mayzax ATS...' }: { label?: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-mayzax-blue" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
