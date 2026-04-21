import {
  detectDesktopShellPlatform,
  getTitlebarSafeArea,
  type DesktopShellPlatformLike
} from '../../../shared/window-shell'

export function getCurrentDesktopShellPlatform(): DesktopShellPlatformLike {
  if (typeof navigator === 'undefined') return 'unknown'
  return detectDesktopShellPlatform(navigator.userAgent)
}

export function getCurrentTitlebarSafeArea() {
  return getTitlebarSafeArea(getCurrentDesktopShellPlatform())
}
