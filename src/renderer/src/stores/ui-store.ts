import { create } from 'zustand'
import type { ModalType } from '@/types'
import { THEME_IDS } from '@/utils/themes'

const THEME_STORAGE_KEY = 'write-ui-theme'
const BOTTOM_PANEL_HEIGHT_STORAGE_KEY = 'write-bottom-panel-height'

function clampBottomPanelHeight(height: number): number {
  if (typeof window === 'undefined') {
    return Math.max(220, Math.min(height, 560))
  }
  const maxHeight = Math.max(220, Math.floor(window.innerHeight * 0.7))
  return Math.max(220, Math.min(Math.round(height), maxHeight))
}

function readStoredTheme(): string {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (v && (THEME_IDS as readonly string[]).includes(v)) return v
  } catch {
    void 0
  }
  return 'dark'
}

const initialTheme = readStoredTheme()

function readStoredBottomPanelHeight(): number {
  try {
    const raw = localStorage.getItem(BOTTOM_PANEL_HEIGHT_STORAGE_KEY)
    if (!raw) return 320
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return 320
    return clampBottomPanelHeight(parsed)
  } catch {
    return 320
  }
}

if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = initialTheme
}

type TypewriterPosition = 'center' | 'upper' | 'lower'

interface ModalEntry {
  type: ModalType
  data: Record<string, unknown> | null
}

interface UIStore {
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  bottomPanelOpen: boolean
  bottomPanelHeight: number
  blackRoomMode: boolean
  blackRoomTextColor: 'green' | 'white'

  focusMode: boolean
  typewriterPosition: TypewriterPosition
  smartTypewriter: boolean

  splitView: boolean
  splitChapterId: number | null

  activeModal: ModalType
  modalData: Record<string, unknown> | null
  modalStack: ModalEntry[]

  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  toggleBottomPanel: () => void
  setBottomPanelHeight: (height: number) => void
  resetBottomPanelHeight: () => void
  setBlackRoomMode: (flag: boolean) => void
  toggleBlackRoomTextColor: () => void

  toggleFocusMode: () => void
  setTypewriterPosition: (pos: TypewriterPosition) => void
  toggleSmartTypewriter: () => void

  toggleSplitView: () => void
  setSplitChapterId: (id: number | null) => void

  theme: string
  setTheme: (theme: string) => void

  openModal: (type: ModalType, data?: Record<string, unknown> | null) => void
  closeModal: () => void
  pushModal: (type: ModalType, data?: Record<string, unknown> | null) => void

  onboardingTourSignal: number
  triggerOnboardingTour: () => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  leftPanelOpen: true,
  rightPanelOpen: true,
  bottomPanelOpen: false,
  bottomPanelHeight: readStoredBottomPanelHeight(),
  blackRoomMode: false,
  blackRoomTextColor: 'green',

  focusMode: false,
  typewriterPosition: 'center',
  smartTypewriter: true,

  splitView: false,
  splitChapterId: null,

  activeModal: null,
  modalData: null,
  modalStack: [],

  onboardingTourSignal: 0,
  triggerOnboardingTour: () =>
    set((s) => ({ onboardingTourSignal: s.onboardingTourSignal + 1 })),

  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setBottomPanelHeight: (height) => {
    const next = clampBottomPanelHeight(height)
    try {
      localStorage.setItem(BOTTOM_PANEL_HEIGHT_STORAGE_KEY, String(next))
    } catch {
      void 0
    }
    set({ bottomPanelHeight: next })
  },
  resetBottomPanelHeight: () => {
    const next = 320
    try {
      localStorage.setItem(BOTTOM_PANEL_HEIGHT_STORAGE_KEY, String(next))
    } catch {
      void 0
    }
    set({ bottomPanelHeight: next })
  },
  setBlackRoomMode: (flag) => set({ blackRoomMode: flag }),
  toggleBlackRoomTextColor: () =>
    set((s) => ({ blackRoomTextColor: s.blackRoomTextColor === 'green' ? 'white' : 'green' })),

  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setTypewriterPosition: (pos) => set({ typewriterPosition: pos }),
  toggleSmartTypewriter: () => set((s) => ({ smartTypewriter: !s.smartTypewriter })),

  toggleSplitView: () => set((s) => ({ splitView: !s.splitView })),
  setSplitChapterId: (id) => set({ splitChapterId: id }),

  theme: initialTheme,
  setTheme: (theme) => {
    const next = (THEME_IDS as readonly string[]).includes(theme) ? theme : 'dark'
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      void 0
    }
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = next
    }
    set({ theme: next })
  },

  openModal: (type, data = null) => set({ activeModal: type, modalData: data, modalStack: [] }),

  pushModal: (type, data = null) => {
    const { activeModal, modalData, modalStack } = get()
    if (activeModal) {
      set({
        modalStack: [...modalStack, { type: activeModal, data: modalData }],
        activeModal: type,
        modalData: data
      })
    } else {
      set({ activeModal: type, modalData: data })
    }
  },

  closeModal: () => {
    const { modalStack } = get()
    if (modalStack.length > 0) {
      const prev = modalStack[modalStack.length - 1]
      set({
        activeModal: prev.type,
        modalData: prev.data,
        modalStack: modalStack.slice(0, -1)
      })
    } else {
      set({ activeModal: null, modalData: null })
    }
  }
}))
