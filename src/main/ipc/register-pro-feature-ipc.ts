import { ipcMain } from 'electron'
import {
  acceptDirectorChapter,
  cancelDirectorRun,
  getDirectorRun,
  listDirectorChapters,
  listDirectorRuns,
  pauseDirectorRun,
  regenerateDirectorStep,
  rejectDirectorChapter,
  resumeDirectorRun,
  startDirectorRun,
  subscribeDirectorProgress
} from '../ai/director-service'
import { generateVisualAssets, getVisualAssets } from '../ai/visual-service'
import { zhengdaoAuth } from './state'
import type { DirectorAcceptChapterInput, DirectorStepName, DirectorStartRunInput } from '../../shared/director'
import type { VisualGenerateInput } from '../../shared/visual'

let directorProgressSeq = 0
const directorProgressSubscriptions = new Map<string, () => void>()

export function registerProFeatureIpc(): void {
  ipcMain.handle('director:startRun', async (_, input: DirectorStartRunInput) =>
    startDirectorRun(input, await zhengdaoAuth.getAccessToken())
  )
  ipcMain.handle('director:getRun', async (_, runId: string) =>
    getDirectorRun(runId, await zhengdaoAuth.getAccessToken())
  )
  ipcMain.handle('director:listRuns', (_, bookId: number) => listDirectorRuns(bookId))
  ipcMain.handle('director:pauseRun', async (_, runId: string) =>
    pauseDirectorRun(runId, await zhengdaoAuth.getAccessToken())
  )
  ipcMain.handle('director:resumeRun', async (_, runId: string) =>
    resumeDirectorRun(runId, await zhengdaoAuth.getAccessToken())
  )
  ipcMain.handle('director:cancelRun', async (_, runId: string) =>
    cancelDirectorRun(runId, await zhengdaoAuth.getAccessToken())
  )
  ipcMain.handle('director:regenerateStep', async (_, runId: string, stepName: DirectorStepName) =>
    regenerateDirectorStep(runId, stepName, await zhengdaoAuth.getAccessToken())
  )
  ipcMain.handle('director:listChapters', async (_, runId: string) =>
    listDirectorChapters(runId, await zhengdaoAuth.getAccessToken())
  )
  ipcMain.handle('director:acceptChapter', async (_, input: DirectorAcceptChapterInput) =>
    acceptDirectorChapter(input, await zhengdaoAuth.getAccessToken())
  )
  ipcMain.handle('director:rejectChapter', async (_, runId: string, chapterId: string) =>
    rejectDirectorChapter(runId, chapterId, await zhengdaoAuth.getAccessToken())
  )
  ipcMain.handle('director:subscribeProgress', async (event, runId: string) => {
    const subscriptionId = `director-progress-${Date.now()}-${directorProgressSeq += 1}`
    const unsubscribe = subscribeDirectorProgress(runId, await zhengdaoAuth.getAccessToken(), {
      onEvent: (payload) => event.sender.send('director:progressEvent', subscriptionId, payload),
      onError: (message) => event.sender.send('director:progressError', subscriptionId, message),
      onDone: () => event.sender.send('director:progressDone', subscriptionId)
    })
    directorProgressSubscriptions.set(subscriptionId, unsubscribe)
    event.sender.once('destroyed', () => {
      directorProgressSubscriptions.get(subscriptionId)?.()
      directorProgressSubscriptions.delete(subscriptionId)
    })
    return { subscriptionId }
  })
  ipcMain.handle('director:unsubscribeProgress', (_, subscriptionId: string) => {
    directorProgressSubscriptions.get(subscriptionId)?.()
    directorProgressSubscriptions.delete(subscriptionId)
    return { ok: true }
  })

  ipcMain.handle('visual:generate', async (_, input: VisualGenerateInput) =>
    generateVisualAssets(input, await zhengdaoAuth.getAccessToken())
  )
  ipcMain.handle('visual:listAssets', (_, bookId: number) => getVisualAssets(bookId))
}
