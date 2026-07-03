import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center px-4">
      <p className="text-6xl font-bold text-mayzax-blue">404</p>
      <h1 className="text-lg font-semibold text-slate-800">Page not found</h1>
      <p className="text-sm text-slate-500 max-w-sm">The page you are looking for doesn't exist or has been moved.</p>
      <Button asChild variant="brand" className="mt-2">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}
