import { motion } from 'framer-motion';
import { Award, Zap, Target } from 'lucide-react';

export type AchievementType = 'first-blood' | 'speedster' | 'perfect';

type AchievementBadgeProps = {
  type: AchievementType;
  size?: 'sm' | 'md';
};

const ACHIEVEMENTS: Record<AchievementType, {
  label: string;
  icon: typeof Award;
  gradient: string;
  glow: string;
}> = {
  'first-blood': {
    label: 'First Blood',
    icon: Award,
    gradient: 'from-amber-400 to-yellow-500',
    glow: 'shadow-amber-400/30',
  },
  speedster: {
    label: 'Speedster',
    icon: Zap,
    gradient: 'from-blue-400 to-cyan-500',
    glow: 'shadow-blue-400/30',
  },
  perfect: {
    label: 'Perfect',
    icon: Target,
    gradient: 'from-emerald-400 to-green-500',
    glow: 'shadow-emerald-400/30',
  },
};

export function AchievementBadge({ type, size = 'sm' }: AchievementBadgeProps) {
  const ach = ACHIEVEMENTS[type];
  const Icon = ach.icon;
  const sizeClasses = size === 'sm' ? 'h-7 px-2.5 text-xs gap-1' : 'h-9 px-3.5 text-sm gap-1.5';
  const iconSize = size === 'sm' ? 12 : 16;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      whileHover={{ scale: 1.1 }}
      className={`inline-flex items-center rounded-full bg-gradient-to-r ${ach.gradient} ${sizeClasses} font-semibold text-white shadow-md ${ach.glow}`}
    >
      <Icon size={iconSize} />
      {ach.label}
    </motion.span>
  );
}
