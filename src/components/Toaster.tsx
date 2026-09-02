import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return <SonnerToaster position="bottom-right" toastOptions={toastStyle} />;
}

const toastStyle = {
  style: {
    background: 'var(--toast-bg)',
    color: 'var(--toast-text)',
    border: '1px solid var(--toast-border)',
  },
  className: 'shadow-lg',
};
