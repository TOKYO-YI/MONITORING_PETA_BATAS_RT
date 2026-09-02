import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Upload } from 'lucide-react';
import { supabase, type PetaRow, type RtRow, type RtAssignmentRow } from '@/lib/supabase';

type ActivityItem = {
  id: string;
  rt_nomor: number;
  file_name: string;
  kampus: string | null;
  created_at: string;
};

type ActivityFeedProps = {
  petaList: PetaRow[];
  rtList: RtRow[];
  assignmentsByRt: Record<string, RtAssignmentRow[]>;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID');
}

export function ActivityFeed({ petaList, rtList, assignmentsByRt }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  // Build activities from existing peta data
  useEffect(() => {
    const rtMap = new Map(rtList.map((rt) => [rt.id, rt]));
    const items: ActivityItem[] = petaList
      .map((p) => {
        const rt = rtMap.get(p.rt_id);
        const assigns = assignmentsByRt[p.rt_id] || [];
        return {
          id: p.id,
          rt_nomor: rt?.nomor_rt ?? 0,
          file_name: p.original_filename,
          kampus: assigns[0]?.kampus || rt?.kampus || null,
          created_at: p.created_at,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 15);

    setActivities(items);
  }, [petaList, rtList, assignmentsByRt]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('peta-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'peta' }, () => {
        // Parent will refetch; this is a passive listener
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-xl border border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/60">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
          <Activity size={16} className="text-teal-600 dark:text-teal-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Aktivitas Terkini</h3>
      </div>

      <div ref={feedRef} className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {activities.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
              Belum ada aktivitas.
            </p>
          ) : (
            activities.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 200, damping: 20 }}
                className="flex items-start gap-2.5 rounded-lg bg-slate-50/80 p-2.5 dark:bg-slate-700/50"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
                  <Upload size={12} className="text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {item.kampus ? (
                      <span className="font-medium text-teal-600 dark:text-teal-400">{item.kampus}</span>
                    ) : (
                      <span className="font-medium text-slate-500 dark:text-slate-400">Admin</span>
                    )}{' '}
                    mengupload peta{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      RT {String(item.rt_nomor).padStart(2, '0')}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                    {item.file_name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    {timeAgo(item.created_at)}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
