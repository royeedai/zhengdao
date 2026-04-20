import { create } from 'zustand'
import type { UpdateSnapshot } from '../../../shared/update'
import { createIdleUpdateSnapshot } from '../../../shared/update'
import { flushAndInstallUpdate } from '@/utils/install-update'
import { useToastStore } from './toast-store'

type PrepareInstallHandler = (() => Promise<void>) | null

interface UpdateStore {
  snapshot: UpdateSnapshot
  installing: boolean
  prepareInstallHandler: PrepareInstallHandler
  setSnapshot: (snapshot: UpdateSnapshot) => void
  setPrepareInstallHandler: (handler: PrepareInstallHandler) => void
  installReadyUpdate: () => Promise<void>
}

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  snapshot: createIdleUpdateSnapshot(),
  installing: false,
  prepareInstallHandler: null,

  setSnapshot: (snapshot) => set({ snapshot }),

  setPrepareInstallHandler: (handler) => {
    set({ prepareInstallHandler: handler })
  },

  installReadyUpdate: async () => {
    const { snapshot, prepareInstallHandler, installing } = get()
    if (installing) return
    if (snapshot.status !== 'ready') {
      throw new Error('当前没有可安装的新版本')
    }

    set({ installing: true })
    try {
      await flushAndInstallUpdate({
        prepare: prepareInstallHandler,
        install: async () => {
          await window.api.installDownloadedUpdate()
        }
      })
    } catch (error) {
      set({ installing: false })
      const message = error instanceof Error ? error.message : '安装更新失败'
      useToastStore.getState().addToast('error', message)
      throw error
    }
  }
}))
