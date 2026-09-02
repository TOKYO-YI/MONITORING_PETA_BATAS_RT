export type KampusColor = {
  bg: string;
  border: string;
  text: string;
  badge: string;
  badgeText: string;
};

const KAMPUS_COLORS: Record<string, KampusColor> = {
  ui: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-900/30',
    badgeText: 'text-blue-700 dark:text-blue-400',
  },
  itb: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-900/30',
    badgeText: 'text-red-700 dark:text-red-400',
  },
  ugm: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-400',
    badge: 'bg-green-100 dark:bg-green-900/30',
    badgeText: 'text-green-700 dark:text-green-400',
  },
  uns: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-400',
    badge: 'bg-purple-100 dark:bg-purple-900/30',
    badgeText: 'text-purple-700 dark:text-purple-400',
  },
  undip: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-700 dark:text-yellow-400',
    badge: 'bg-yellow-100 dark:bg-yellow-900/30',
    badgeText: 'text-yellow-700 dark:text-yellow-400',
  },
  ub: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    border: 'border-cyan-200 dark:border-cyan-800',
    text: 'text-cyan-700 dark:text-cyan-400',
    badge: 'bg-cyan-100 dark:bg-cyan-900/30',
    badgeText: 'text-cyan-700 dark:text-cyan-400',
  },
  unair: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-400',
    badge: 'bg-rose-100 dark:bg-rose-900/30',
    badgeText: 'text-rose-700 dark:text-rose-400',
  },
  unhas: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-teal-200 dark:border-teal-800',
    text: 'text-teal-700 dark:text-teal-400',
    badge: 'bg-teal-100 dark:bg-teal-900/30',
    badgeText: 'text-teal-700 dark:text-teal-400',
  },
};

const FALLBACK: KampusColor = {
  bg: 'bg-slate-50 dark:bg-slate-700',
  border: 'border-slate-200 dark:border-slate-600',
  text: 'text-slate-600 dark:text-slate-300',
  badge: 'bg-slate-100 dark:bg-slate-700',
  badgeText: 'text-slate-600 dark:text-slate-300',
};

export function getKampusColor(kampus: string | null | undefined): KampusColor | null {
  if (!kampus) return null;
  const key = kampus.toLowerCase().trim();

  // Match by common abbreviations and full names
  if (key.includes('ui') || key.includes('indonesia') && key.includes('universitas')) {
    // "Universitas Indonesia" — check more carefully
    if (key === 'ui' || key.includes('universitas indonesia')) return KAMPUS_COLORS.ui;
  }
  if (key === 'itb' || key.includes('institut teknologi bandung') || key.includes('itb')) return KAMPUS_COLORS.itb;
  if (key === 'ugm' || key.includes('universitas gadjah mada') || key.includes('ugm')) return KAMPUS_COLORS.ugm;
  if (key === 'uns' || key.includes('universitas sebelas maret') || key.includes('uns')) return KAMPUS_COLORS.uns;
  if (key === 'undip' || key.includes('universitas diponegoro') || key.includes('undip')) return KAMPUS_COLORS.undip;
  if (key === 'ub' || key.includes('universitas brawijaya') || key.includes('brawijaya')) return KAMPUS_COLORS.ub;
  if (key === 'unair' || key.includes('universitas airlangga') || key.includes('airlangga')) return KAMPUS_COLORS.unair;
  if (key === 'unhas' || key.includes('universitas hasanuddin') || key.includes('hasanuddin')) return KAMPUS_COLORS.unhas;

  // Generic university match
  if (key.includes('ui ') || key === 'ui') return KAMPUS_COLORS.ui;

  return FALLBACK;
}
