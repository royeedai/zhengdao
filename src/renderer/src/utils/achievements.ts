export interface Achievement {
  type: string
  label: string
  description: string
  icon: string
  check: (stats: {
    totalWords: number
    streak: number
    maxDailyWords: number
    totalDays: number
  }) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  { type: 'first_1k', label: '初出茅庐', description: '累计写作 1000 字', icon: '✍️', check: (s) => s.totalWords >= 1000 },
  { type: 'first_10k', label: '小试牛刀', description: '累计写作 10000 字', icon: '📝', check: (s) => s.totalWords >= 10000 },
  { type: 'first_100k', label: '十万大山', description: '累计写作 100000 字', icon: '📖', check: (s) => s.totalWords >= 100000 },
  { type: 'first_500k', label: '半百征途', description: '累计写作 500000 字', icon: '📚', check: (s) => s.totalWords >= 500000 },
  { type: 'first_1m', label: '百万巨著', description: '累计写作 1000000 字', icon: '🏆', check: (s) => s.totalWords >= 1000000 },
  { type: 'streak_7', label: '七日不辍', description: '连续写作 7 天', icon: '🔥', check: (s) => s.streak >= 7 },
  { type: 'streak_30', label: '月更不断', description: '连续写作 30 天', icon: '💪', check: (s) => s.streak >= 30 },
  { type: 'streak_100', label: '百日铸剑', description: '连续写作 100 天', icon: '⚔️', check: (s) => s.streak >= 100 },
  { type: 'daily_5k', label: '日更五千', description: '单日写作 5000 字', icon: '⚡', check: (s) => s.maxDailyWords >= 5000 },
  { type: 'daily_10k', label: '万字更新', description: '单日写作 10000 字', icon: '🚀', check: (s) => s.maxDailyWords >= 10000 }
]
