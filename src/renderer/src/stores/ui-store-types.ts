import type { ModalType } from '@/types'
import type { ThemeId } from '@/utils/themes'
import type {
  RightPanelTab,
  WorkspaceLayoutPanelSizes,
  WorkspaceLayoutPresetDefinition,
  WorkspaceLayoutPresetId
} from '@/utils/workspace-layout'
import type { AiAssistantLauncherPosition, AiAssistantPanelRect } from '@/components/ai/panel-layout'
import type { ChapterSaveStatus } from '../utils/daily-workbench'
import type { AssistantSurface } from '../../../shared/ai-book-creation'

export type TypewriterPosition = 'center' | 'upper' | 'lower'

export type AiAssistantOpenOptions = {
  input?: string
  autoSend?: boolean
  surface?: AssistantSurface
}

export type InlineAiDraft = {
  id: number
  title: string
  payload: Record<string, unknown>
  chapterId: number
  conversationId: number | null
  retryInput: string
}

export type AiChapterDraft = {
  id: number
  title: string
  content: string
  summary: string
  volumeId: number | null
  volumeTitle: string
  conversationId: number | null
  retryInput: string
}

export type AiAssistantCommand = {
  id: number
  input: string
  autoSend: boolean
  surface?: AssistantSurface
}

export interface ModalEntry {
  type: ModalType
  data: Record<string, unknown> | null
}

export interface UIStore {
  leftPanelOpen: boolean
  leftPanelWidth: number
  rightPanelOpen: boolean
  rightPanelWidth: number
  rightPanelTab: RightPanelTab
  bottomPanelOpen: boolean
  bottomPanelHeight: number
  workspaceLayoutPresetId: WorkspaceLayoutPresetId
  workspaceLayoutPanelSizes: WorkspaceLayoutPanelSizes
  customWorkspaceLayoutPresets: WorkspaceLayoutPresetDefinition[]
  workspaceLayoutMigrated: boolean
  topbarToolsCollapsed: boolean
  blackRoomMode: boolean
  blackRoomTextColor: 'green' | 'white'

  focusMode: boolean
  typewriterPosition: TypewriterPosition
  smartTypewriter: boolean

  splitView: boolean
  splitChapterId: number | null

  aiAssistantOpen: boolean
  aiAssistantPanelRect: AiAssistantPanelRect
  aiAssistantLauncherPosition: AiAssistantLauncherPosition
  aiAssistantSelectionText: string
  aiAssistantSelectionChapterId: number | null
  aiAssistantSelectionFrom: number | null
  aiAssistantSelectionTo: number | null
  aiAssistantCommand: AiAssistantCommand | null
  inlineAiDraft: InlineAiDraft | null
  aiChapterDraft: AiChapterDraft | null
  chapterSaveStatus: ChapterSaveStatus

  activeModal: ModalType
  modalData: Record<string, unknown> | null
  modalStack: ModalEntry[]

  toggleLeftPanel: () => void
  setLeftPanelWidth: (width: number) => void
  toggleRightPanel: () => void
  setRightPanelWidth: (width: number) => void
  setRightPanelTab: (tab: RightPanelTab) => void
  setBottomPanelOpen: (open: boolean) => void
  toggleBottomPanel: () => void
  setBottomPanelHeight: (height: number) => void
  resetBottomPanelHeight: () => void
  setWorkspaceLayoutPanelSizes: (sizes: Partial<WorkspaceLayoutPanelSizes>) => void
  applyWorkspaceLayoutPreset: (presetId: WorkspaceLayoutPresetId) => void
  saveCurrentWorkspaceLayoutPreset: (name: string) => WorkspaceLayoutPresetDefinition | null
  deleteCustomWorkspaceLayoutPreset: (presetId: WorkspaceLayoutPresetId) => void
  markWorkspaceLayoutMigrated: () => void
  setTopbarToolsCollapsed: (collapsed: boolean) => void
  toggleTopbarToolsCollapsed: () => void
  setBlackRoomMode: (flag: boolean) => void
  toggleBlackRoomTextColor: () => void

  toggleFocusMode: () => void
  setTypewriterPosition: (pos: TypewriterPosition) => void
  toggleSmartTypewriter: () => void

  toggleSplitView: () => void
  setSplitChapterId: (id: number | null) => void

  openAiAssistant: (options?: AiAssistantOpenOptions | string | null) => void
  closeAiAssistant: () => void
  consumeAiAssistantCommand: (id: number) => void
  setAiAssistantPanelRect: (rect: AiAssistantPanelRect) => void
  setAiAssistantLauncherPosition: (position: AiAssistantLauncherPosition) => void
  setAiAssistantSelection: (data: {
    text: string
    chapterId: number | null
    from: number | null
    to: number | null
  }) => void
  setInlineAiDraft: (draft: InlineAiDraft | null) => void
  clearInlineAiDraft: (draftId?: number | null) => void
  setAiChapterDraft: (draft: AiChapterDraft | null) => void
  updateAiChapterDraft: (
    updates: Partial<Pick<AiChapterDraft, 'title' | 'content' | 'summary' | 'volumeId' | 'volumeTitle'>>
  ) => void
  clearAiChapterDraft: (draftId?: number | null) => void
  setChapterSaveStatus: (status: ChapterSaveStatus) => void
  markChapterDirty: (chapterId: number) => void
  markChapterSaving: (chapterId: number) => void
  markChapterSaved: (chapterId: number, savedAt?: string) => void
  markChapterSaveError: (chapterId: number, error: string) => void

  theme: ThemeId
  setTheme: (theme: string) => void

  openModal: (type: ModalType, data?: Record<string, unknown> | null) => void
  closeModal: () => void
  pushModal: (type: ModalType, data?: Record<string, unknown> | null) => void

  onboardingTourSignal: number
  triggerOnboardingTour: () => void
}
