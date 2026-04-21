import { app, BrowserWindow, type BrowserWindowConstructorOptions } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import {
  getDesktopWindowChrome,
  normalizeDesktopShellPlatform,
  shouldStripNativeMenu
} from '../shared/window-shell'

function resolveRuntimeIconPath(): string | undefined {
  const candidates = [
    join(process.resourcesPath, 'icon.png'),
    join(process.resourcesPath, 'resources', 'icon.png'),
    join(app.getAppPath(), 'resources', 'icon.png'),
    join(__dirname, '../../resources/icon.png'),
    join(process.cwd(), 'resources/icon.png')
  ]

  return candidates.find((candidate) => existsSync(candidate))
}

export function getMainWindowShellOptions(
  platform: NodeJS.Platform
): Pick<
  BrowserWindowConstructorOptions,
  'backgroundColor' | 'title' | 'titleBarStyle' | 'titleBarOverlay' | 'trafficLightPosition' | 'icon'
> {
  const normalizedPlatform = normalizeDesktopShellPlatform(platform)
  const chrome = getDesktopWindowChrome(normalizedPlatform)
  const iconPath = resolveRuntimeIconPath()

  return {
    ...chrome,
    ...(iconPath && normalizedPlatform !== 'darwin' ? { icon: iconPath } : {})
  }
}

export function getAuxiliaryWindowShellOptions(
  platform: NodeJS.Platform,
  title: string
): Pick<BrowserWindowConstructorOptions, 'title' | 'icon'> {
  const normalizedPlatform = normalizeDesktopShellPlatform(platform)
  const iconPath = resolveRuntimeIconPath()

  return {
    title,
    ...(iconPath && normalizedPlatform !== 'darwin' ? { icon: iconPath } : {})
  }
}

export function applyDesktopWindowShell(window: BrowserWindow, platform: NodeJS.Platform): void {
  const normalizedPlatform = normalizeDesktopShellPlatform(platform)
  if (!shouldStripNativeMenu(normalizedPlatform)) return

  window.removeMenu()
  window.setMenuBarVisibility(false)
  window.setAutoHideMenuBar(true)
}
