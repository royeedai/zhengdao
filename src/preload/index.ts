import { contextBridge } from 'electron'
import { api } from './api'

export type { ElectronAPI } from './api'

contextBridge.exposeInMainWorld('api', api)
