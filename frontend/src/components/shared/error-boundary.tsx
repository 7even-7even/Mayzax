import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // In production, send to Sentry / LogRocket here
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[60vh] w-full items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
          <Card className="w-full max-w-lg border-slate-200 shadow-xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Something went wrong</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    An unexpected error crashed this section. Your data is safe.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Error details</p>
                  <p className="text-xs font-mono text-slate-500 break-all line-clamp-3">
                    {this.state.error.message}
                  </p>
                  {import.meta.env.DEV && this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600">Stack trace (dev only)</summary>
                      <pre className="mt-2 text-[10px] text-slate-500 whitespace-pre-wrap max-h-32 overflow-auto bg-white rounded border p-2">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="brand" size="sm" onClick={this.handleReset} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try Again
                </Button>
                <Button variant="outline" size="sm" onClick={this.handleReload} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reload Page
                </Button>
                <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/')} className="gap-1.5">
                  <Home className="h-3.5 w-3.5" />
                  Go Home
                </Button>
              </div>

              <p className="text-[11px] text-slate-400">
                If this keeps happening, contact support with the error details above.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lightweight fallback for route-level boundaries
export function RouteErrorFallback({ reset }: { reset?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 border border-amber-100 text-amber-600 mb-4">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-slate-900">This page failed to load</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">Something broke while rendering. Try again or go back.</p>
      {reset && (
        <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
          Retry
        </Button>
      )}
    </div>
  );
}
