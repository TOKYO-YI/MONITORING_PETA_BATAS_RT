import { useState } from 'react';
import { Modal } from './Modal';
import { Lock, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginModal({ open, onClose }: LoginModalProps) {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setMessage(null);
  };

  const handleClose = () => {
    reset();
    setMode('login');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        toast.error('Login gagal');
      } else {
        toast.success('Berhasil login');
        handleClose();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        toast.error('Login gagal');
      } else if (data.user) {
        setMessage('Akun admin berhasil dibuat. Silakan masuk dengan email dan password tersebut.');
        setMode('login');
      }
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={handleClose} title={mode === 'login' ? 'Login Admin' : 'Buat Akun Admin'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-2 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/30">
            {mode === 'login' ? <Lock className="text-teal-600 dark:text-teal-400" size={24} /> : <UserPlus className="text-teal-600 dark:text-teal-400" size={24} />}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@kelurahan.go.id"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Minimal 6 karakter"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
        )}

        {message && (
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">{message}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : mode === 'login' ? <Lock size={16} /> : <UserPlus size={16} />}
          {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
        </button>

        <div className="text-center text-xs text-slate-400 dark:text-slate-500">
          {mode === 'login' ? (
            <>
              Belum punya akun admin?{' '}
              <button
                type="button"
                onClick={() => { reset(); setMode('signup'); }}
                className="font-medium text-teal-600 hover:underline dark:text-teal-400"
              >
                Buat akun baru
              </button>
            </>
          ) : (
            <>
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => { reset(); setMode('login'); }}
                className="font-medium text-teal-600 hover:underline dark:text-teal-400"
              >
                Masuk
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Hanya admin yang dapat mengunggah, mengubah, dan menghapus file peta.
        </p>
      </form>
    </Modal>
  );
}
