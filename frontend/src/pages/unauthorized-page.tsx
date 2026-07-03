import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center px-4">
      <ShieldAlert className="h-12 w-12 text-amber-500" />
      <h1 className="text-lg font-semibold text-slate-800">Access denied</h1>
      <p className="text-sm text-slate-500 max-w-sm">You don't have permission to view this page.</p>
      <Button asChild variant="brand" className="mt-2">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}
