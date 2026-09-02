import { useState } from 'react';
import { Modal } from './Modal';
import { MapPreview } from './MapPreview';
import {
  Download, Trash2, FileText, Calendar, AlignLeft, Loader2,
  Link2, ExternalLink, Pencil, Check, X, GraduationCap, AlertCircle, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, formatBytes, formatDate, type RtRow, type PetaRow, type RtAssignmentRow } from '@/lib/supabase';
import { getKampusColor } from '@/lib/kampusColors';
import { useAuth } from '@/lib/auth';

type RtDetailModalProps = {
  open: boolean;
  onClose: () => void;
  rt: RtRow | null;
  petaList: PetaRow[];
  assignments: RtAssignmentRow[];
  onOpenUpload: () => void;
  onChanged: () => void;
};

export function RtDetailModal({
  open,
  onClose,
  rt,
  petaList,
  assignments,
  onOpenUpload,
  onChanged,
}: RtDetailModalProps) {
  const { session } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editKeterangan, setEditKeterangan] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Assignment form state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [editingAssignId, setEditingAssignId] = useState<string | null>(null);
  const [assignKampus, setAssignKampus] = useState('');
  const [assignKelompok, setAssignKelompok] = useState('');
  const [assignPj, setAssignPj] = useState('');
  const [assignLink, setAssignLink] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  if (!rt) return null;

  const isDone = petaList.length > 0;
  const rtLabel = `RT ${String(rt.nomor_rt).padStart(2, '0')}`;

  const handleDownload = async (peta: PetaRow) => {
    if (peta.file_path.startsWith('placeholder/')) {
      toast.error('File ini tidak tersedia untuk diunduh. Silakan ganti dengan file asli.');
      return;
    }
    const { data, error } = await supabase.storage.from('peta').download(peta.file_path);
    if (error) {
      toast.error('Gagal mengunduh file: ' + error.message);
      return;
    }
    const url = URL.createObjectURL(data);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = peta.original_filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (peta: PetaRow) => {
    if (!confirm(`Hapus file "${peta.nama_file}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeletingId(peta.id);
    setSaveError(null);
    try {
      if (!peta.file_path.startsWith('placeholder/')) {
        await supabase.storage.from('peta').remove([peta.file_path]);
      }
      const { error } = await supabase.from('peta').delete().eq('id', peta.id);
      if (error) throw error;
      toast.success('File berhasil dihapus');
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setSaveError('Gagal menghapus: ' + msg);
      toast.error('Gagal menghapus file');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (peta: PetaRow) => {
    setEditingId(peta.id);
    setEditNama(peta.nama_file);
    setEditKeterangan(peta.keterangan || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase
        .from('peta')
        .update({ nama_file: editNama, keterangan: editKeterangan || null })
        .eq('id', editingId);
      if (error) throw error;
      setEditingId(null);
      toast.success('Data file diperbarui');
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setSaveError('Gagal menyimpan: ' + msg);
      toast.error('Gagal memperbarui file');
    } finally {
      setSaving(false);
    }
  };

  // Assignment CRUD
  const resetAssignForm = () => {
    setAssignKampus('');
    setAssignKelompok('');
    setAssignPj('');
    setAssignLink('');
    setEditingAssignId(null);
  };

  const startAddAssign = () => {
    resetAssignForm();
    setShowAssignForm(true);
  };

  const startEditAssign = (a: RtAssignmentRow) => {
    setAssignKampus(a.kampus);
    setAssignKelompok(a.kelompok_kkn || '');
    setAssignPj(a.penanggung_jawab || '');
    setAssignLink(a.link_kegiatan || '');
    setEditingAssignId(a.id);
    setShowAssignForm(true);
  };

  const saveAssignment = async () => {
    if (!rt) return;
    if (!assignKampus.trim()) {
      toast.error('Kampus wajib diisi');
      return;
    }
    setSavingAssign(true);
    setSaveError(null);
    try {
      if (editingAssignId) {
        const { error } = await supabase
          .from('rt_assignment')
          .update({
            kampus: assignKampus.trim(),
            kelompok_kkn: assignKelompok.trim() || null,
            penanggung_jawab: assignPj.trim() || null,
            link_kegiatan: assignLink.trim() || null,
          })
          .eq('id', editingAssignId);
        if (error) throw error;
        toast.success('Data kampus diperbarui');
      } else {
        const { error } = await supabase
          .from('rt_assignment')
          .insert({
            rt_id: rt.id,
            kampus: assignKampus.trim(),
            kelompok_kkn: assignKelompok.trim() || null,
            penanggung_jawab: assignPj.trim() || null,
            link_kegiatan: assignLink.trim() || null,
          });
        if (error) throw error;
        toast.success('Kampus baru ditambahkan');
      }
      setShowAssignForm(false);
      resetAssignForm();
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setSaveError('Gagal menyimpan data kampus: ' + msg);
      toast.error('Gagal menyimpan data kampus');
    } finally {
      setSavingAssign(false);
    }
  };

  const deleteAssignment = async (a: RtAssignmentRow) => {
    if (!confirm(`Hapus data kampus "${a.kampus}" dari RT ini?`)) return;
    try {
      const { error } = await supabase.from('rt_assignment').delete().eq('id', a.id);
      if (error) throw error;
      toast.success('Data kampus dihapus');
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setSaveError('Gagal menghapus data kampus: ' + msg);
      toast.error('Gagal menghapus data kampus');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Detail ${rtLabel}`} maxWidth="max-w-2xl">
      <div className="max-h-[80vh] space-y-4 overflow-y-auto pr-1">
        {/* Error banner */}
        {saveError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle size={16} />
            {saveError}
          </div>
        )}

        {/* Status badge */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
              isDone
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
            }`}
          >
            {isDone ? '✓ SUDAH DIKERJAKAN' : '○ BELUM DIKERJAKAN'}
          </span>
          <span className="text-sm text-slate-400 dark:text-slate-500">
            {petaList.length} file peta
          </span>
        </div>

        {/* Kampus yang Mengambil RT ini */}
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-teal-600 dark:text-teal-400" />
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Kampus yang Mengambil RT ini
              </h4>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                {assignments.length}
              </span>
            </div>
            {session && !showAssignForm && (
              <button
                onClick={startAddAssign}
                className="flex items-center gap-1 rounded-md border border-teal-300 px-2 py-1 text-xs font-medium text-teal-600 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-900/20"
              >
                <Plus size={12} /> Tambah Kampus
              </button>
            )}
          </div>

          {/* Assignment form */}
          {showAssignForm && (
            <div className="mb-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/50">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Kampus <span className="text-red-500">*</span>
                </label>
                <input
                  value={assignKampus}
                  onChange={(e) => setAssignKampus(e.target.value)}
                  placeholder="Nama kampus/universitas..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Kelompok KKN</label>
                <input
                  value={assignKelompok}
                  onChange={(e) => setAssignKelompok(e.target.value)}
                  placeholder="Nama kelompok KKN..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Penanggung Jawab</label>
                <input
                  value={assignPj}
                  onChange={(e) => setAssignPj(e.target.value)}
                  placeholder="Nama penanggung jawab..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Link Laporan Kegiatan</label>
                <input
                  type="url"
                  value={assignLink}
                  onChange={(e) => setAssignLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveAssignment}
                  disabled={savingAssign}
                  className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {savingAssign ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Simpan
                </button>
                <button
                  onClick={() => { setShowAssignForm(false); resetAssignForm(); }}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <X size={14} /> Batal
                </button>
              </div>
            </div>
          )}

          {/* Assignment list */}
          {assignments.length === 0 && !showAssignForm ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Belum ada kampus yang ditugaskan untuk RT ini.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => {
                const color = getKampusColor(a.kampus);
                return (
                  <div
                    key={a.id}
                    className={`rounded-lg border p-3 ${color?.border || 'border-slate-200 dark:border-slate-600'} ${color?.bg || 'bg-slate-50 dark:bg-slate-700'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h5 className={`font-bold ${color?.text || 'text-slate-700 dark:text-slate-200'}`}>
                          {a.kampus}
                        </h5>
                        {a.kelompok_kkn && (
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                            Kelompok: {a.kelompok_kkn}
                          </p>
                        )}
                        {a.penanggung_jawab && (
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                            PJ: {a.penanggung_jawab}
                          </p>
                        )}
                        {a.link_kegiatan && (
                          <a
                            href={a.link_kegiatan}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-1 flex items-center gap-1 text-xs ${color?.text || 'text-teal-600 dark:text-teal-400'} hover:underline`}
                          >
                            <ExternalLink size={10} />
                            <span className="truncate">{a.link_kegiatan}</span>
                          </a>
                        )}
                      </div>
                      {session && !showAssignForm && (
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() => startEditAssign(a)}
                            className="rounded-md border border-slate-300 p-1 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => deleteAssignment(a)}
                            className="rounded-md border border-red-200 p-1 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add another kampus button */}
              {session && !showAssignForm && assignments.length > 0 && (
                <button
                  onClick={startAddAssign}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-teal-300 py-2 text-sm font-medium text-teal-600 transition hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-900/20"
                >
                  <Plus size={14} /> Tambah Kampus Lain
                </button>
              )}
            </div>
          )}
        </div>

        {/* No files state */}
        {petaList.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center dark:border-slate-600">
            <FileText className="mx-auto mb-2 text-slate-300 dark:text-slate-600" size={32} />
            <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada file peta untuk {rtLabel}.</p>
            {session && (
              <button
                onClick={onOpenUpload}
                className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
              >
                Tambah File Peta
              </button>
            )}
          </div>
        )}

        {/* File list */}
        {petaList.map((peta) => (
          <div key={peta.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            {editingId === peta.id ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Nama Peta</label>
                  <input
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Keterangan</label>
                  <textarea
                    value={editKeterangan}
                    onChange={(e) => setEditKeterangan(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Simpan
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <X size={14} /> Batal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="truncate font-medium text-slate-800 dark:text-slate-100">{peta.nama_file}</h4>
                    <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{peta.original_filename}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    {peta.file_type}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                    {formatDate(peta.tanggal_pembuatan)}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <FileText size={14} className="text-slate-400 dark:text-slate-500" />
                    {peta.file_size > 0 ? formatBytes(peta.file_size) : '-'}
                  </div>
                </div>

                {peta.keterangan && (
                  <div className="mb-3 flex items-start gap-1.5 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    <AlignLeft size={14} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span>{peta.keterangan}</span>
                  </div>
                )}

                <div className="mb-3">
                  <MapPreview peta={peta} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDownload(peta)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Download size={14} /> Download
                  </button>
                  {session && (
                    <>
                      <button
                        onClick={() => startEdit(peta)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <Pencil size={14} /> Edit File
                      </button>
                      <button
                        onClick={() => handleDelete(peta)}
                        disabled={deletingId === peta.id}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        {deletingId === peta.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Hapus
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add file button for admin when files exist */}
        {session && petaList.length > 0 && (
          <button
            onClick={onOpenUpload}
            className="w-full rounded-lg border border-dashed border-teal-300 py-2.5 text-sm font-medium text-teal-600 transition hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-900/20"
          >
            + Tambah File Lain
          </button>
        )}
      </div>
    </Modal>
  );
}
