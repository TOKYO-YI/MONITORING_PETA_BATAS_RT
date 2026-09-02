import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Map as MapIcon, Search, LogIn, LogOut, Shield, Download,
  CheckCircle2, Circle, Layers, Moon, Sun, Flame, ArrowUp, SearchX,
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
import { ActivityFeed } from '@/components/ActivityFeed';
import { useScrollHeader } from '@/hooks/useScrollHeader';
import { useCountUp } from '@/hooks/useCountUp';

type FilterType = 'all' | 'done' | 'undone';
type SortType = 'asc' | 'desc' | 'done-first' | 'undone-first';

const KELURAHAN_NAME = 'Kelurahan';

export default function App() {
  const { session } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const scrolled = useScrollHeader();
  const [rtList, setRtList] = useState<RtRow[]>([]);
  const [petaByRt, setPetaByRt] = useState<Record<string, PetaRow[]>>({});
  const [assignmentsByRt, setAssignmentsByRt] = useState<Record<string, RtAssignmentRow[]>>({});
  const [allPetas, setAllPetas] = useState<PetaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('asc');
  const [uploadRt, setUploadRt] = useState<RtRow | null>(null);
  const [detailRt, setDetailRt] = useState<RtRow | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

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
    setAllPetas(petas || []);

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

  // Back to top visibility
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Streak calculation
  const streak = useMemo(() => {
    if (allPetas.length === 0) return 0;
    const dates = new Set<string>();
    for (const p of allPetas) {
      dates.add(p.created_at.slice(0, 10));
    }
    const sortedDates = Array.from(dates).sort().reverse();
    if (sortedDates.length === 0) return 0;

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Start streak from today or yesterday
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

    let count = 0;
    let checkDate = new Date(sortedDates[0]);
    for (const dateStr of sortedDates) {
      const d = new Date(dateStr);
      const diff = Math.round((checkDate.getTime() - d.getTime()) / 86400000);
      if (diff === count) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [allPetas]);

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

  const animatedTotal = useCountUp(stats.total);
  const animatedDone = useCountUp(stats.done);
  const animatedUndone = useCountUp(stats.undone);
  const animatedProgress = useCountUp(Math.round(stats.progress * 10) / 10);

  const filteredRts = useMemo(() => {
    let result = [...rtList];

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

    if (filter === 'done') {
      result = result.filter((rt) => (petaByRt[rt.id] || []).length > 0);
    } else if (filter === 'undone') {
      result = result.filter((rt) => (petaByRt[rt.id] || []).length === 0);
    }

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
        ? petas.map((p) => p.updated_at).sort().reverse()[0]
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

  const resetFilters = () => {
    setSearch('');
    setFilter('all');
    setSort('asc');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header — glassmorphism */}
      <header
        className={`sticky top-0 z-30 border-b border-white/20 bg-white/80 backdrop-blur-xl transition-all duration-300 dark:border-slate-700/30 dark:bg-slate-900/80 ${
          scrolled ? 'py-2 shadow-lg' : 'py-3'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md">
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
              {/* Streak badge */}
              {streak > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-400 to-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md sm:flex"
                >
                  <Flame size={14} />
                  {streak} hari berturut-turut!
                </motion.div>
              )}
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white/80 active:scale-95 dark:border-slate-600/60 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800/80 sm:text-sm"
                title="Export CSV"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white/80 active:scale-95 dark:border-slate-600/60 dark:bg-slate-700 dark:text-yellow-400 dark:hover:bg-slate-600 sm:text-sm"
                title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </button>
              {session ? (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 active:scale-95 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 sm:text-sm"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              ) : (
                <button
                  onClick={() => setLoginOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:from-teal-600 hover:to-teal-700 active:scale-95 sm:text-sm"
                >
                  <LogIn size={14} />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Gradient line under header */}
        <div className="h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex gap-6">
          {/* Main content */}
          <main className="min-w-0 flex-1">
            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {[
                { label: 'TOTAL RT', value: animatedTotal, icon: <Layers size={18} />, color: 'slate' as const },
                { label: 'SUDAH DIKERJAKAN', value: animatedDone, icon: <CheckCircle2 size={18} />, color: 'green' as const },
                { label: 'BELUM DIKERJAKAN', value: animatedUndone, icon: <Circle size={18} />, color: 'amber' as const },
                { label: 'PROGRESS', value: `${animatedProgress.toFixed(1)}%`, icon: <MapIcon size={18} />, color: 'teal' as const },
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
              className="mb-8 rounded-xl border border-white/40 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/60"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Progress Pembuatan Peta</h2>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {stats.done} dari {stats.total} RT selesai
                </span>
              </div>
              <div className={`h-4 w-full overflow-hidden rounded-full bg-slate-100/80 dark:bg-slate-700/80 ${stats.progress >= 80 ? 'shadow-[0_0_12px_rgba(20,184,166,0.3)]' : ''}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.progress}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                  className="animate-shimmer h-full rounded-full bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500"
                />
              </div>
              <p className="mt-2 text-right text-sm font-semibold text-teal-600 dark:text-teal-400">{animatedProgress.toFixed(1)}%</p>
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
                  className="w-full rounded-lg border border-slate-300/60 bg-white/60 py-2 pl-9 pr-3 text-sm text-slate-700 backdrop-blur-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800/60 dark:border-slate-600 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterType)}
                  className="rounded-lg border border-slate-300/60 bg-white/60 px-3 py-2 text-sm text-slate-700 backdrop-blur-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800/60 dark:border-slate-600 dark:text-slate-200"
                >
                  <option value="all">Semua RT</option>
                  <option value="done">Sudah Dikerjakan</option>
                  <option value="undone">Belum Dikerjakan</option>
                </select>

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortType)}
                  className="rounded-lg border border-slate-300/60 bg-white/60 px-3 py-2 text-sm text-slate-700 backdrop-blur-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-slate-800/60 dark:border-slate-600 dark:text-slate-200"
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
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-teal-50/80 px-3 py-2 text-sm text-teal-700 backdrop-blur-sm dark:bg-teal-900/30 dark:text-teal-400">
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
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <SearchX className="text-slate-300 dark:text-slate-600" size={36} />
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500">Oops, RT yang kamu cari belum ada nih</p>
                <button
                  onClick={resetFilters}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 active:scale-95"
                >
                  Reset Filter
                </button>
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

          {/* Sidebar — Activity Feed (desktop only) */}
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-24">
              <ActivityFeed petaList={allPetas} rtList={rtList} assignmentsByRt={assignmentsByRt} />
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white/60 py-4 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-800/60">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-400 dark:text-slate-500 sm:px-6">
          Sistem Monitoring Pembuatan Peta Batas RT — {KELURAHAN_NAME}
        </div>
      </footer>

      {/* Back to top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition hover:bg-teal-700 active:scale-90"
            title="Kembali ke atas"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

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
      text: 'text-slate-700 dark:text-slate-200',
      iconBg: 'from-slate-400 to-slate-500',
      border: 'border-slate-200/40 dark:border-slate-700/50',
    },
    green: {
      text: 'text-green-700 dark:text-green-400',
      iconBg: 'from-green-400 to-green-500',
      border: 'border-green-200/40 dark:border-green-800/50',
    },
    amber: {
      text: 'text-amber-700 dark:text-amber-400',
      iconBg: 'from-amber-400 to-amber-500',
      border: 'border-amber-200/40 dark:border-amber-800/50',
    },
    teal: {
      text: 'text-teal-700 dark:text-teal-400',
      iconBg: 'from-teal-400 to-teal-500',
      border: 'border-teal-200/40 dark:border-teal-800/50',
    },
  };
  const c = colorMap[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: '0 8px 24px -8px rgba(0,0,0,0.12)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden rounded-xl border ${c.border} bg-white/60 p-4 shadow-sm backdrop-blur-md dark:bg-slate-800/60`}
    >
      {/* Gradient icon in top-right */}
      <div className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${c.iconBg} text-white shadow-sm`}>
        {icon}
      </div>
      <div className="mb-3">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${c.text} sm:text-3xl`}>{value}</p>
    </motion.div>
  );
}
