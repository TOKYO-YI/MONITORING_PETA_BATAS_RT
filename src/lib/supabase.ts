import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type RtRow = {
  id: string;
  nomor_rt: number;
  nama_rt: string | null;
  link_kegiatan: string | null;
  kampus: string | null;
  kelompok_kkn: string | null;
  penanggung_jawab: string | null;
  created_at: string;
  updated_at: string;
};

export type PetaRow = {
  id: string;
  rt_id: string;
  nama_file: string;
  original_filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  keterangan: string | null;
  tanggal_pembuatan: string | null;
  created_at: string;
  updated_at: string;
};

export type RtAssignmentRow = {
  id: string;
  rt_id: string;
  kampus: string;
  kelompok_kkn: string | null;
  penanggung_jawab: string | null;
  link_kegiatan: string | null;
  created_at: string;
};

export type RtWithPeta = RtRow & {
  peta: PetaRow[];
};

export const ACCEPTED_FILE_TYPES = [
  'tif', 'tiff', 'shp', 'geojson', 'kml', 'kmz', 'zip', 'pdf', 'png', 'jpg', 'jpeg',
];

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop()!.toLowerCase();
}

export function isImageFile(fileType: string): boolean {
  return ['png', 'jpg', 'jpeg'].includes(fileType.toLowerCase());
}

export function isPdfFile(fileType: string): boolean {
  return fileType.toLowerCase() === 'pdf';
}

export function isGeoFile(fileType: string): boolean {
  return ['geojson', 'kml', 'kmz'].includes(fileType.toLowerCase());
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
