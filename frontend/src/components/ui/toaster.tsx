import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border shadow-lg',
          success: '!bg-emerald-50 !text-emerald-800 !border-emerald-200',
          error: '!bg-red-50 !text-red-800 !border-red-200',
        },
      }}
    />
  );
}
