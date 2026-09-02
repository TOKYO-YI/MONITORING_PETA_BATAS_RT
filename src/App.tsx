import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Map as MapIcon, Search, LogIn, LogOut, Shield, Download,
  CheckCircle2, Circle, Layers, Moon, Sun,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, type RtRow, type PetaRow, type RtAssignmentRow } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';
import { RtCard } from '@/components/RtCard';
import { UploadModal } from '@/components/UploadModal';
import { RtDetailModal } from '@/components/RtDetailModal';
import { LoginModal } from '@/components/LoginModal';
import { Toaster } from '@/components/Toaster';
import { RtCardSkeleton } from '@/components/RtCardSkeleton';

type FilterType = 'all' | 'done' | 'undone';
type SortType = 'asc' | 'desc' | 'done-first' | 'undone-first';

const KELURAHAN_NAME = 'Kelurahan';

export default function App() {
  const { session } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [rtList, setRtList] = useState<RtRow[]>([]);
  const [petaByRt, setPetaByRt] = useState<Record<string, PetaRow[]>>({});
  const [assignmentsByRt, setAssignmentsByRt] = useState<Record<string, RtAssignmentRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('asc');
  const [uploadRt, setUploadRt] = useState<RtRow | null>(null);
  const [detailRt, setDetailRt] = useState<RtRow | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: rts, error: rtError }, { data: petas, error: petaError }, { data: assignments, error: assignError }] = await Promise.all([
      supabase.from('rt').select('*').order('nomor_rt', { ascending: true }),
      supabase.from('peta').select('*').order('created_at', { ascending: false }),
      supabase.from('rt_assignment').select('*').order('created_at', { ascending: true }),
    ]);

    if (rtError || petaError || assignError) {
      toast.error('Gagal memuat data');
      setLoading(false);
      return;
    }

    setRtList(rts || []);

    const groupedPeta: Record<string, PetaRow[]> = {};
    for (const p of petas || []) {
      if (!groupedPeta[p.rt_id]) groupedPeta[p.rt_id] = [];
      groupedPeta[p.rt_id].push(p);
    }
    setPetaByRt(groupedPeta);

    const groupedAssign: Record<string, RtAssignmentRow[]> = {};
    for (const a of assignments || []) {
      if (!groupedAssign[a.rt_id]) groupedAssign[a.rt_id] = [];
      groupedAssign[a.rt_id].push(a);
    }
    setAssignmentsByRt(groupedAssign);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const total = rtList.length;
    let done = 0;
    for (const rt of rtList) {
      if ((petaByRt[rt.id] || []).length > 0) done++;
    }
    const undone = total - done;
    const progress = total > 0 ? (done / total) * 100 : 0;
    return { total, done, undone, progress };
  }, [rtList, petaByRt]);

  const filteredRts = useMemo(() => {
    let result = [...rtList];

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase().replace(/\D/g, '');
      const qStr = search.trim().toLowerCase();
      result = result.filter((rt) => {
        const label = `rt ${String(rt.nomor_rt).padStart(2, '0')}`;
        const labelShort = `rt${String(rt.nomor_rt).padStart(2, '0')}`;
        const num = String(rt.nomor_rt);
        const assigns = assignmentsByRt[rt.id] || [];
        const assignMatch = assigns.some(
          (a) =>
            a.kampus.toLowerCase().includes(qStr) ||
            (a.kelompok_kkn?.toLowerCase().includes(qStr) ?? false)
        );
        return (
          label.includes(qStr) ||
          labelShort.includes(qStr) ||
          num === q ||
          (rt.nama_rt?.toLowerCase().includes(qStr) ?? false) ||
          (rt.kampus?.toLowerCase().includes(qStr) ?? false) ||
          (rt.kelompok_kkn?.toLowerCase().includes(qStr) ?? false) ||
          assignMatch
        );
      });
    }

    // Filter
    if (filter === 'done') {
      result = result.filter((rt) => (petaByRt[rt.id] || []).length > 0);
    } else if (filter === 'undone') {
      result = result.filter((rt) => (petaByRt[rt.id] || []).length === 0);
    }

    // Sort
    if (sort === 'asc') {
      result.sort((a, b) => a.nomor_rt - b.nomor_rt);
    } else if (sort === 'desc') {
      result.sort((a, b) => b.nomor_rt - a.nomor_rt);
    } else if (sort === 'done-first') {
      result.sort((a, b) => {
        const aDone = (petaByRt[a.id] || []).length > 0 ? 0 : 1;
        const bDone = (petaByRt[b.id] || []).length > 0 ? 0 : 1;
        if (aDone !== bDone) return aDone - bDone;
        return a.nomor_rt - b.nomor_rt;
      });
    } else if (sort === 'undone-first') {
      result.sort((a, b) => {
        const aDone = (petaByRt[a.id] || []).length > 0 ? 1 : 0;
        const bDone = (petaByRt[b.id] || []).length > 0 ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.nomor_rt - b.nomor_rt;
      });
    }

    return result;
  }, [rtList, petaByRt, assignmentsByRt, search, filter, sort]);

  const handleExportCsv = () => {
    const rows = rtList.map((rt) => {
      const petas = petaByRt[rt.id] || [];
      const assigns = assignmentsByRt[rt.id] || [];
      const status = petas.length > 0 ? 'Sudah Dikerjakan' : 'Belum Dikerjakan';
      const lastUpdate = petas.length > 0
        ? petas
            .map((p) => p.updated_at)
            .sort()
            .reverse()[0]
        : '';
      const files = petas.map((p) => p.original_filename).join('; ');
      const kampusList = assigns.map((a) => a.kampus).join('; ') || rt.kampus || '';
      const kelompokList = assigns.map((a) => a.kelompok_kkn).filter(Boolean).join('; ') || rt.kelompok_kkn || '';
      return `RT ${String(rt.nomor_rt).padStart(2, '0')}|${kampusList}|${kelompokList}|${status}|${files}|${lastUpdate}`;
    });

    const csv = ['RT|Kampus|Kelompok KKN|Status|File|Tanggal Terakhir Diperbarui', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `monitoring_peta_rt_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
                <MapIcon size={20} />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight text-slate-800 dark:text-slate-100 sm:text-lg">
                  MONITORING PETA BATAS RT
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">{KELURAHAN_NAME}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 sm:text-sm"
                title="Export CSV"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-yellow-400 dark:hover:bg-slate-600 sm:text-sm"
                title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </button>
              {session ? (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 sm:text-sm"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              ) : (
                <button
                  onClick={() => setLoginOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700 sm:text-sm"
                >
                  <LogIn size={14} />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[
            { label: 'TOTAL RT', value: stats.total, icon: <Layers size={18} />, color: 'slate' as const },
            { label: 'SUDAH DIKERJAKAN', value: stats.done, icon: <CheckCircle2 size={18} />, color: 'green' as const },
            { label: 'BELUM DIKERJAKAN', value: stats.undone, icon: <Circle size={18} />, color: 'amber' as const },
            { label: 'PROGRESS', value: `${stats.progress.toFixed(1)}%`, icon: <MapIcon size={18} />, color: 'teal' as const },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
            >
              <StatCard label={card.label} value={card.value} icon={card.icon} color={card.color} />
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Progress Pembuatan Peta</h2>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {stats.done} dari {stats.total} RT selesai
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.progress}%` }}
              transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600"
            />
          </div>
          <p className="mt-2 text-right text-sm font-semibold text-teal-600 dark:text-teal-400">{stats.progress.toFixed(1)}%</p>
        </motion.div>

        {/* Search, Filter, Sort */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari RT / kampus / kelompok..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
            >
              <option value="all">Semua RT</option>
              <option value="done">Sudah Dikerjakan</option>
              <option value="undone">Belum Dikerjakan</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
            >
              <option value="asc">Nomor RT Terkecil</option>
              <option value="desc">Nomor RT Terbesar</option>
              <option value="done-first">Sudah Dikerjakan Dulu</option>
              <option value="undone-first">Belum Dikerjakan Dulu</option>
            </select>
          </div>
        </div>

        {/* Admin badge */}
        {session && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
            <Shield size={16} />
            <span>Mode Admin: Anda dapat menambah, mengubah, dan menghapus file peta.</span>
          </div>
        )}

        {/* RT Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <RtCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredRts.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            Tidak ada RT yang cocok dengan pencarian.
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <AnimatePresence mode="popLayout">
              {filteredRts.map((rt, index) => (
                <motion.div
                  key={rt.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <RtCard
                    rt={rt}
                    petaList={petaByRt[rt.id] || []}
                    assignments={assignmentsByRt[rt.id] || []}
                    onView={() => setDetailRt(rt)}
                    onAddFile={() => setUploadRt(rt)}
                    onChanged={fetchData}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-400 dark:text-slate-500 sm:px-6">
          Sistem Monitoring Pembuatan Peta Batas RT — {KELURAHAN_NAME}
        </div>
      </footer>

      {/* Modals */}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <UploadModal
        open={!!uploadRt}
        onClose={() => setUploadRt(null)}
        rt={uploadRt}
        assignments={uploadRt ? (assignmentsByRt[uploadRt.id] || []) : []}
        onUploaded={fetchData}
      />
      <RtDetailModal
        open={!!detailRt}
        onClose={() => setDetailRt(null)}
        rt={detailRt}
        petaList={detailRt ? (petaByRt[detailRt.id] || []) : []}
        assignments={detailRt ? (assignmentsByRt[detailRt.id] || []) : []}
        onOpenUpload={() => {
          setUploadRt(detailRt);
        }}
        onChanged={fetchData}
      />

      <Toaster />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'slate' | 'green' | 'amber' | 'teal';
}) {
  const colorMap = {
    slate: {
      bg: 'bg-slate-50 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-200',
      icon: 'text-slate-400 dark:text-slate-500',
      border: 'border-slate-200 dark:border-slate-700',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-400',
      icon: 'text-green-500 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-400',
      icon: 'text-amber-500 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
    },
    teal: {
      bg: 'bg-teal-50 dark:bg-teal-900/20',
      text: 'text-teal-700 dark:text-teal-400',
      icon: 'text-teal-500 dark:text-teal-400',
      border: 'border-teal-200 dark:border-teal-800',
    },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 shadow-sm`}>
      <div className="mb-1 flex items-center gap-2">
        <span className={c.icon}>{icon}</span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${c.text} sm:text-3xl`}>{value}</p>
    </div>
  );
}
