import { useEffect, useRef } from 'react'
import type { UpdateSnapshot } from '../../../../shared/update'
import { useUpdateStore } from '@/stores/update-store'
import { useToastStore } from '@/stores/toast-store'

function readyToastMessage(snapshot: UpdateSnapshot): string {
  return snapshot.version
    ? `新版本 ${snapshot.version} 已下载，点击标题栏“更新”立即安装`
    : '新版本已下载，点击标题栏“更新”立即安装'
}

export default function UpdateBootstrap() {
  const setSnapshot = useUpdateStore((s) => s.setSnapshot)
  const notifiedVersionRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    let unsubscribe = () => void 0

    const applySnapshot = (snapshot: UpdateSnapshot) => {
      setSnapshot(snapshot)
      if (snapshot.status === 'ready' && snapshot.version && notifiedVersionRef.current !== snapshot.version) {
        notifiedVersionRef.current = snapshot.version
        useToastStore.getState().addToast('info', readyToastMessage(snapshot), 5000)
      }
    }

    void window.api
      .getUpdateState()
      .then((snapshot) => {
        if (!active) return
        applySnapshot(snapshot)
      })
      .catch((error) => {
        console.error('[Updater] Failed to get initial update state:', error)
      })

    unsubscribe = window.api.onUpdateState((snapshot) => {
      if (!active) return
      applySnapshot(snapshot)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [setSnapshot])

  return null
}
