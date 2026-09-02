import { useState } from 'react';
import { Modal } from './Modal';
import { Upload, Loader2, GraduationCap, Link2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE, getFileExtension, type RtRow, type RtAssignmentRow } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type UploadModalProps = {
  open: boolean;
  onClose: () => void;
  rt: RtRow | null;
  assignments: RtAssignmentRow[];
  onUploaded: () => void;
};

type KampusMode = 'none' | 'existing' | 'new' | 'manual';

export function UploadModal({ open, onClose, rt, assignments, onUploaded }: UploadModalProps) {
  const { session } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [namaPeta, setNamaPeta] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Kampus selection
  const [kampusMode, setKampusMode] = useState<KampusMode>('none');
  const [selectedAssignId, setSelectedAssignId] = useState<string>('');
  const [newKampus, setNewKampus] = useState('');
  const [newKelompok, setNewKelompok] = useState('');
  const [newPj, setNewPj] = useState('');
  const [newLink, setNewLink] = useState('');
  const [manualKampus, setManualKampus] = useState('');
  const [manualKelompok, setManualKelompok] = useState('');
  const [manualPj, setManualPj] = useState('');
  const [manualLink, setManualLink] = useState('');

  const resetForm = () => {
    setFile(null);
    setNamaPeta('');
    setKeterangan('');
    setTanggal(new Date().toISOString().slice(0, 10));
    setError(null);
    setKampusMode('none');
    setSelectedAssignId('');
    setNewKampus('');
    setNewKelompok('');
    setNewPj('');
    setNewLink('');
    setManualKampus('');
    setManualKelompok('');
    setManualPj('');
    setManualLink('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const ext = getFileExtension(selected.name);
    if (!ACCEPTED_FILE_TYPES.includes(ext)) {
      setError(`Format .${ext} tidak didukung. Format yang diterima: ${ACCEPTED_FILE_TYPES.join(', ')}`);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('Ukuran file melebihi batas maksimum 100 MB.');
      return;
    }
    setError(null);
    setFile(selected);
    if (!namaPeta) setNamaPeta(`Peta Batas RT ${String(rt?.nomor_rt ?? '').padStart(2, '0')}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !rt || !session) {
      setError('Lengkapi semua field wajib.');
      return;
    }

    if (kampusMode === 'new' && !newKampus.trim()) {
      setError('Nama kampus wajib diisi untuk kampus baru.');
      return;
    }
    if (kampusMode === 'manual' && !manualKampus.trim()) {
      setError('Nama kampus wajib diisi.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const ext = getFileExtension(file.name);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${rt.nomor_rt}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('peta')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('peta').insert({
        rt_id: rt.id,
        nama_file: namaPeta || `Peta Batas RT ${String(rt.nomor_rt).padStart(2, '0')}`,
        original_filename: file.name,
        file_path: filePath,
        file_type: ext,
        file_size: file.size,
        keterangan: keterangan || null,
        tanggal_pembuatan: tanggal || null,
      });

      if (dbError) throw dbError;

      // Insert new assignment if kampus new/manual selected
      if (kampusMode === 'new' && newKampus.trim()) {
        const { error: assignError } = await supabase.from('rt_assignment').insert({
          rt_id: rt.id,
          kampus: newKampus.trim(),
          kelompok_kkn: newKelompok.trim() || null,
          penanggung_jawab: newPj.trim() || null,
          link_kegiatan: newLink.trim() || null,
        });
        if (assignError) throw assignError;
      } else if (kampusMode === 'manual' && manualKampus.trim()) {
        const { error: assignError } = await supabase.from('rt_assignment').insert({
          rt_id: rt.id,
          kampus: manualKampus.trim(),
          kelompok_kkn: manualKelompok.trim() || null,
          penanggung_jawab: manualPj.trim() || null,
          link_kegiatan: manualLink.trim() || null,
        });
        if (assignError) throw assignError;
      }

      toast.success('File berhasil diunggah!');
      resetForm();
      onUploaded();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah file.';
      setError(msg);
      toast.error('Gagal mengunggah: ' + msg);
    } finally {
      setUploading(false);
    }
  };

  if (!rt) return null;

  return (
    <Modal open={open} onClose={handleClose} title={`Upload File Peta — RT ${String(rt.nomor_rt).padStart(2, '0')}`}>
      <form onSubmit={handleSubmit} className="max-h-[80vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">RT</label>
          <input
            type="text"
            value={`RT ${String(rt.nomor_rt).padStart(2, '0')}`}
            disabled
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Pilih File <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            required
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100 dark:text-slate-300 dark:file:bg-teal-900/30 dark:file:text-teal-400"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Format: {ACCEPTED_FILE_TYPES.map((t) => `.${t}`).join(', ')} — Maks 100 MB
          </p>
          {file && (
            <p className="mt-1 text-xs text-teal-600 dark:text-teal-400">
              Terpilih: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Nama Peta</label>
          <input
            type="text"
            value={namaPeta}
            onChange={(e) => setNamaPeta(e.target.value)}
            placeholder="Peta Batas RT 07"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Keterangan</label>
          <textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            rows={2}
            placeholder="Catatan tambahan tentang peta ini..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Tanggal Pembuatan</label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
          />
        </div>

        {/* Kampus selection */}
        <div className="rounded-lg border border-slate-200 bg-blue-50/50 p-3 dark:border-slate-700 dark:bg-blue-900/10">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Pilih Kampus (Opsional)</span>
          </div>

          {/* Dropdown */}
          <select
            value={kampusMode}
            onChange={(e) => setKampusMode(e.target.value as KampusMode)}
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
          >
            <option value="none">Tidak memilih kampus</option>
            {assignments.length > 0 && (
              <optgroup label="Kampus yang sudah ada">
                {assignments.map((a) => (
                  <option key={a.id} value={`existing:${a.id}`}>
                    {a.kampus}{a.kelompok_kkn ? ` — ${a.kelompok_kkn}` : ''}
                  </option>
                ))}
              </optgroup>
            )}
            <option value="new">+ Kampus Baru...</option>
            <option value="manual">Isi Manual</option>
          </select>

          {/* New kampus form */}
          {kampusMode === 'new' && (
            <div className="space-y-3 rounded-lg border border-blue-500/30 bg-white p-3 dark:bg-slate-800">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Kampus <span className="text-red-500">*</span>
                </label>
                <input
                  value={newKampus}
                  onChange={(e) => setNewKampus(e.target.value)}
                  placeholder="Nama kampus/universitas..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Kelompok KKN</label>
                <input
                  value={newKelompok}
                  onChange={(e) => setNewKelompok(e.target.value)}
                  placeholder="Nama kelompok KKN..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Penanggung Jawab</label>
                <input
                  value={newPj}
                  onChange={(e) => setNewPj(e.target.value)}
                  placeholder="Nama penanggung jawab..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Link Laporan Kegiatan</label>
                <input
                  type="url"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
            </div>
          )}

          {/* Manual input */}
          {kampusMode === 'manual' && (
            <div className="space-y-3 rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Kampus <span className="text-red-500">*</span>
                </label>
                <input
                  value={manualKampus}
                  onChange={(e) => setManualKampus(e.target.value)}
                  placeholder="Nama kampus/universitas..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Kelompok KKN</label>
                <input
                  value={manualKelompok}
                  onChange={(e) => setManualKelompok(e.target.value)}
                  placeholder="Nama kelompok KKN..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Penanggung Jawab</label>
                <input
                  value={manualPj}
                  onChange={(e) => setManualPj(e.target.value)}
                  placeholder="Nama penanggung jawab..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Link Laporan Kegiatan</label>
                <input
                  type="url"
                  value={manualLink}
                  onChange={(e) => setManualLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={uploading || !file}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Menyimpan...' : 'Simpan Semua'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
