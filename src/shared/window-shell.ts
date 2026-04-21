export const APP_DISPLAY_NAME = '证道'

export type DesktopShellPlatform = 'darwin' | 'win32' | 'linux'
export type DesktopShellPlatformLike = DesktopShellPlatform | 'unknown'

export interface DesktopTitlebarSafeArea {
  leftInset: number
  rightInset: number
  overlayHeight: number
}

export interface DesktopWindowChrome {
  backgroundColor: string
  title: string
  titleBarStyle?: 'default' | 'hidden' | 'hiddenInset'
  titleBarOverlay?: false | { color: string; symbolColor: string; height: number }
  trafficLightPosition?: { x: number; y: number }
}

export const DESKTOP_CHROME_BACKGROUND = '#141414'
export const DESKTOP_CHROME_SYMBOL = '#d4d4d8'
export const WINDOWS_TITLEBAR_OVERLAY_HEIGHT = 48

export function normalizeDesktopShellPlatform(platform: string): DesktopShellPlatformLike {
  if (platform === 'darwin' || platform === 'win32' || platform === 'linux') return platform
  return 'unknown'
}

export function detectDesktopShellPlatform(userAgent: string): DesktopShellPlatformLike {
  const source = userAgent.toLowerCase()
  if (source.includes('windows')) return 'win32'
  if (source.includes('mac os') || source.includes('macintosh')) return 'darwin'
  if (source.includes('linux') || source.includes('x11')) return 'linux'
  return 'unknown'
}

export function shouldStripNativeMenu(platform: DesktopShellPlatformLike): boolean {
  return platform === 'win32' || platform === 'linux'
}

export function getTitlebarSafeArea(platform: DesktopShellPlatformLike): DesktopTitlebarSafeArea {
  switch (platform) {
    case 'darwin':
      return { leftInset: 88, rightInset: 16, overlayHeight: 48 }
    case 'win32':
      return { leftInset: 18, rightInset: 152, overlayHeight: WINDOWS_TITLEBAR_OVERLAY_HEIGHT }
    case 'linux':
      return { leftInset: 18, rightInset: 18, overlayHeight: 48 }
    default:
      return { leftInset: 18, rightInset: 18, overlayHeight: 48 }
  }
}

export function getDesktopWindowChrome(platform: DesktopShellPlatformLike): DesktopWindowChrome {
  if (platform === 'darwin') {
    return {
      backgroundColor: DESKTOP_CHROME_BACKGROUND,
      title: APP_DISPLAY_NAME,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 16 }
    }
  }

  if (platform === 'win32') {
    return {
      backgroundColor: DESKTOP_CHROME_BACKGROUND,
      title: APP_DISPLAY_NAME,
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: DESKTOP_CHROME_BACKGROUND,
        symbolColor: DESKTOP_CHROME_SYMBOL,
        height: WINDOWS_TITLEBAR_OVERLAY_HEIGHT
      }
    }
  }

  return {
    backgroundColor: DESKTOP_CHROME_BACKGROUND,
    title: APP_DISPLAY_NAME
  }
}
