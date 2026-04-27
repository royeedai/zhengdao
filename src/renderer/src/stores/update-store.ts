import { create } from 'zustand'
import type { ManualInstallerDownloadResult, UpdateSnapshot } from '../../../shared/update'
import { createIdleUpdateSnapshot } from '../../../shared/update'
import { flushAndInstallUpdate } from '@/utils/install-update'
import { useToastStore } from './toast-store'

type PrepareInstallHandler = (() => Promise<void>) | null

interface UpdateStore {
  appVersion: string
  snapshot: UpdateSnapshot
  prepareInstallHandler: PrepareInstallHandler
  setAppVersion: (version: string) => void
  setSnapshot: (snapshot: UpdateSnapshot) => void
  setPrepareInstallHandler: (handler: PrepareInstallHandler) => void
  checkForUpdates: () => Promise<UpdateSnapshot>
  downloadAvailableUpdate: () => Promise<UpdateSnapshot>
  downloadManualInstallerUpdate: () => Promise<ManualInstallerDownloadResult>
  installReadyUpdate: () => Promise<void>
}

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  appVersion: '',
  snapshot: createIdleUpdateSnapshot(),
  prepareInstallHandler: null,

  setAppVersion: (appVersion) => set({ appVersion }),
  setSnapshot: (snapshot) => set({ snapshot }),

  setPrepareInstallHandler: (handler) => {
    set({ prepareInstallHandler: handler })
  },

  checkForUpdates: async () => {
    const { snapshot } = get()
    if (snapshot.status === 'checking' || snapshot.status === 'downloading' || snapshot.status === 'installing') {
      return snapshot
    }

    try {
      const next = await window.api.checkForUpdates()
      set({ snapshot: next })
      if (next.status === 'idle') {
        useToastStore.getState().addToast('info', '当前未发现可用更新')
      }
      return next
    } catch (error) {
      const message = error instanceof Error ? error.message : '检查更新失败'
      useToastStore.getState().addToast('error', message)
      throw error
    }
  },

  downloadAvailableUpdate: async () => {
    const { snapshot } = get()
    if (snapshot.automaticUpdateUnsupportedReason) {
      throw new Error(snapshot.automaticUpdateUnsupportedReason)
    }
    if (
      snapshot.status !== 'available' &&
      !(snapshot.status === 'error' && snapshot.errorRecoveryAction === 'download')
    ) {
      throw new Error('当前没有可下载的新版本')
    }

    try {
      const next = await window.api.downloadUpdate()
      set({ snapshot: next })
      return next
    } catch (error) {
      const message = error instanceof Error ? error.message : '下载更新失败'
      useToastStore.getState().addToast('error', message)
      throw error
    }
  },

  downloadManualInstallerUpdate: async () => {
    const { snapshot } = get()
    if (!snapshot.automaticUpdateUnsupportedReason) {
      throw new Error('当前平台支持应用内自动更新，无需手动下载安装包')
    }
    if (!snapshot.version) {
      throw new Error('当前没有可下载的新版本')
    }

    try {
      const result = await window.api.downloadManualInstallerUpdate()
      useToastStore.getState().addToast('success', `安装包已下载并打开：${result.fileName}`, 5000)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : '下载安装包失败'
      useToastStore.getState().addToast('error', message)
      throw error
    }
  },

  installReadyUpdate: async () => {
    const { snapshot, prepareInstallHandler } = get()
    if (snapshot.status === 'installing') return
    if (snapshot.automaticUpdateUnsupportedReason) {
      throw new Error(snapshot.automaticUpdateUnsupportedReason)
    }
    if (snapshot.status !== 'ready') {
      throw new Error('当前没有可安装的新版本')
    }

    try {
      await flushAndInstallUpdate({
        prepare: prepareInstallHandler,
        install: async () => {
          await window.api.installDownloadedUpdate()
        }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '安装更新失败'
      useToastStore.getState().addToast('error', message)
      throw error
    }
  }
}))
