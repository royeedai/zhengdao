export const RELATION_TYPES = [
  { value: 'ally', label: '盟友', color: '#10b981' },
  { value: 'enemy', label: '仇敌', color: '#ef4444' },
  { value: 'master', label: '师徒', color: '#8b5cf6' },
  { value: 'lover', label: '恋人', color: '#ec4899' },
  { value: 'family', label: '亲属', color: '#f59e0b' },
  { value: 'subordinate', label: '从属', color: '#6366f1' }
]

export function relationColor(type: string): string {
  return RELATION_TYPES.find((t) => t.value === type)?.color ?? '#64748b'
}
