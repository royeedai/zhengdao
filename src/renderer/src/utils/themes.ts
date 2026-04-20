export const THEME_IDS = [
  'dark',
  'dark-green',
  'dark-blue',
  'dark-warm',
  'dark-oled',
  'light'
] as const

export type ThemeId = (typeof THEME_IDS)[number]

export const THEME_LABELS: Record<ThemeId, string> = {
  dark: '默认暗色',
  'dark-green': '墨绿夜',
  'dark-blue': '深蓝夜',
  'dark-warm': '暖灰',
  'dark-oled': '纯黑 OLED',
  light: '亮色'
}

export type ThemeCssVariables = {
  '--bg-primary': string
  '--bg-secondary': string
  '--bg-tertiary': string
  '--bg-editor': string
  '--border-primary': string
  '--border-secondary': string
  '--text-primary': string
  '--text-secondary': string
  '--text-muted': string
  '--accent-primary': string
  '--accent-secondary': string
}

export const THEME_TOKENS: Record<ThemeId, ThemeCssVariables> = {
  dark: {
    '--bg-primary': '#141414',
    '--bg-secondary': '#1a1a1a',
    '--bg-tertiary': '#1e1e1e',
    '--bg-editor': '#1e1e1e',
    '--border-primary': '#2a2a2a',
    '--border-secondary': '#333333',
    '--text-primary': '#e2e8f0',
    '--text-secondary': '#94a3b8',
    '--text-muted': '#64748b',
    '--accent-primary': '#10b981',
    '--accent-secondary': '#34d399'
  },
  'dark-green': {
    '--bg-primary': '#0a1a14',
    '--bg-secondary': '#0f2318',
    '--bg-tertiary': '#132d1e',
    '--bg-editor': '#0f2318',
    '--border-primary': '#1a3d28',
    '--border-secondary': '#245235',
    '--text-primary': '#d1fae5',
    '--text-secondary': '#86efac',
    '--text-muted': '#4ade80',
    '--accent-primary': '#10b981',
    '--accent-secondary': '#34d399'
  },
  'dark-blue': {
    '--bg-primary': '#0a0f1a',
    '--bg-secondary': '#0f1623',
    '--bg-tertiary': '#131c2d',
    '--bg-editor': '#0f1623',
    '--border-primary': '#1a2a3d',
    '--border-secondary': '#243a52',
    '--text-primary': '#dbeafe',
    '--text-secondary': '#93c5fd',
    '--text-muted': '#60a5fa',
    '--accent-primary': '#10b981',
    '--accent-secondary': '#34d399'
  },
  'dark-warm': {
    '--bg-primary': '#1a1816',
    '--bg-secondary': '#211f1c',
    '--bg-tertiary': '#282520',
    '--bg-editor': '#211f1c',
    '--border-primary': '#3d3830',
    '--border-secondary': '#524b40',
    '--text-primary': '#e8e0d4',
    '--text-secondary': '#b8ad9e',
    '--text-muted': '#8a7e6e',
    '--accent-primary': '#10b981',
    '--accent-secondary': '#34d399'
  },
  'dark-oled': {
    '--bg-primary': '#000000',
    '--bg-secondary': '#0a0a0a',
    '--bg-tertiary': '#111111',
    '--bg-editor': '#000000',
    '--border-primary': '#1a1a1a',
    '--border-secondary': '#222222',
    '--text-primary': '#e2e8f0',
    '--text-secondary': '#94a3b8',
    '--text-muted': '#64748b',
    '--accent-primary': '#10b981',
    '--accent-secondary': '#34d399'
  },
  light: {
    '--bg-primary': '#f8fafc',
    '--bg-secondary': '#ffffff',
    '--bg-tertiary': '#f1f5f9',
    '--bg-editor': '#ffffff',
    '--border-primary': '#e2e8f0',
    '--border-secondary': '#cbd5e1',
    '--text-primary': '#1e293b',
    '--text-secondary': '#475569',
    '--text-muted': '#94a3b8',
    '--accent-primary': '#059669',
    '--accent-secondary': '#10b981'
  }
}
