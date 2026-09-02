import { motion } from 'framer-motion';
import {
  CheckCircle2, Circle, FileText, Eye, Download, Trash2, Plus,
  GraduationCap, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, formatBytes, type RtRow, type PetaRow, type RtAssignmentRow } from '@/lib/supabase';
import { getKampusColor } from '@/lib/kampusColors';
import { useAuth } from '@/lib/auth';

type RtCardProps = {
  rt: RtRow;
  petaList: PetaRow[];
  assignments: RtAssignmentRow[];
  onView: () => void;
  onAddFile: () => void;
  onChanged: () => void;
};

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function RtCard({ rt, petaList, assignments, onView, onAddFile, onChanged }: RtCardProps) {
  const { session } = useAuth();
  const isDone = petaList.length > 0;
  const rtLabel = `RT ${String(rt.nomor_rt).padStart(2, '0')}`;

  const handleDownload = async (e: React.MouseEvent, peta: PetaRow) => {
    e.stopPropagation();
    if (peta.file_path.startsWith('placeholder/')) {
      toast.error('File ini tidak tersedia untuk diunduh. Silakan ganti dengan file asli.');
      return;
    }
    const { data, error } = await supabase.storage.from('peta').download(peta.file_path);
    if (error) {
      toast.error('Gagal mengunduh: ' + error.message);
      return;
    }
    const url = URL.createObjectURL(data);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = peta.original_filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (e: React.MouseEvent, peta: PetaRow) => {
    e.stopPropagation();
    if (!confirm(`Hapus file "${peta.nama_file}"?`)) return;
    try {
      if (!peta.file_path.startsWith('placeholder/')) {
        await supabase.storage.from('peta').remove([peta.file_path]);
      }
      const { error } = await supabase.from('peta').delete().eq('id', peta.id);
      if (error) throw error;
      toast.success('File berhasil dihapus');
      onChanged();
    } catch (err) {
      toast.error('Gagal menghapus file: ' + (err instanceof Error ? err.message : ''));
    }
  };

  // Determine card border color based on kampus
  const firstKampus = assignments[0]?.kampus || rt.kampus;
  const kampusColor = isDone ? getKampusColor(firstKampus) : null;
  const cardBorder = kampusColor
    ? kampusColor.border
    : isDone
      ? 'border-green-200 dark:border-green-800'
      : 'border-slate-200 dark:border-slate-700';

  // Kampus badges from assignments (max 3, +N if more)
  const kampusBadges = assignments.length > 0
    ? assignments.map((a) => ({ name: a.kampus, color: getKampusColor(a.kampus) }))
    : rt.kampus
      ? [{ name: rt.kampus, color: getKampusColor(rt.kampus) }]
      : [];
  const visibleBadges = kampusBadges.slice(0, 3);
  const extraCount = kampusBadges.length - 3;

  return (
    <motion.div
      layout
      whileHover={{ y: -4, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={onView}
      className={`group relative flex min-h-[280px] cursor-pointer flex-col overflow-hidden rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 ${cardBorder}`}
    >
      {/* Background decoration for undone cards */}
      {!isDone && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <MapPin className="text-slate-200 dark:text-slate-700" size={120} strokeWidth={1} style={{ opacity: 0.4 }} />
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{rtLabel}</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            isDone
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          }`}
        >
          {isDone ? <CheckCircle2 size={14} /> : <Circle size={14} />}
          {isDone ? 'SELESAI' : 'BELUM'}
        </span>
      </div>

      {/* Status bar */}
      <div
        className={`mb-3 rounded-lg px-3 py-2 text-center text-sm font-medium ${
          isDone
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-slate-50 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        }`}
      >
        {isDone ? '✓ SUDAH DIKERJAKAN' : '○ BELUM DIKERJAKAN'}
      </div>

      {/* Kampus badges */}
      {visibleBadges.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {visibleBadges.map((badge, i) => {
            const color = badge.color || getKampusColor(badge.name);
            return (
              <span
                key={i}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${color?.badge || 'bg-slate-100 dark:bg-slate-700'} ${color?.badgeText || 'text-slate-600 dark:text-slate-300'}`}
              >
                <GraduationCap size={11} className="shrink-0" />
                <span className="max-w-[120px] truncate">{toTitleCase(badge.name)}</span>
              </span>
            );
          })}
          {extraCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              +{extraCount}
            </span>
          )}
        </div>
      )}

      {/* Content area — fills remaining space */}
      <div className="flex flex-1 flex-col">
        {isDone ? (
          <>
            {/* File list (max 2) */}
            <div className="space-y-2">
              {petaList.slice(0, 2).map((peta) => (
                <div key={peta.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-700">
                  <FileText size={14} className="shrink-0 text-slate-400 dark:text-slate-500" />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300">{peta.original_filename}</span>
                  {peta.file_size > 0 && (
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatBytes(peta.file_size)}</span>
                  )}
                </div>
              ))}
              {petaList.length > 2 && (
                <p className="text-center text-xs text-slate-400 dark:text-slate-500">+{petaList.length - 2} file lainnya</p>
              )}
            </div>

            {/* Action buttons — pinned to bottom */}
            <div className="mt-auto flex flex-wrap gap-2 pt-3">
              <button
                onClick={(e) => { e.stopPropagation(); onView(); }}
                className="flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700"
              >
                <Eye size={12} /> Lihat
              </button>
              <button
                onClick={(e) => handleDownload(e, petaList[0])}
                className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Download size={12} /> Download
              </button>
              {session && (
                <button
                  onClick={(e) => handleDelete(e, petaList[0])}
                  className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={12} /> Hapus
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Undone placeholder */}
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4">
              {session ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddFile(); }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-teal-300 py-2.5 text-sm font-medium text-teal-600 transition hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-900/20"
                >
                  <Plus size={14} /> Tambah File Peta
                </button>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">Menunggu upload file</p>
              )}
            </div>

            {/* Action buttons pinned to bottom for undone too */}
            {session && (
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onAddFile(); }}
                  className="flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700"
                >
                  <Plus size={12} /> Tambah File
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
