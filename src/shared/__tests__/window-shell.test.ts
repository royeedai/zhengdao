import { describe, expect, it } from 'vitest'
import {
  APP_DISPLAY_NAME,
  detectDesktopShellPlatform,
  getDesktopWindowChrome,
  getTitlebarSafeArea,
  shouldStripNativeMenu
} from '../window-shell'

describe('window-shell', () => {
  it('uses the unified app display name across desktop chrome', () => {
    expect(APP_DISPLAY_NAME).toBe('证道')
    expect(getDesktopWindowChrome('darwin').title).toBe('证道')
    expect(getDesktopWindowChrome('win32').title).toBe('证道')
  })

  it('strips native menus only on Windows and Linux', () => {
    expect(shouldStripNativeMenu('darwin')).toBe(false)
    expect(shouldStripNativeMenu('win32')).toBe(true)
    expect(shouldStripNativeMenu('linux')).toBe(true)
  })

  it('keeps macOS traffic lights while using a Windows title bar overlay', () => {
    expect(getDesktopWindowChrome('darwin')).toMatchObject({
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 16 }
    })

    expect(getDesktopWindowChrome('win32')).toMatchObject({
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#141414',
        symbolColor: '#d4d4d8',
        height: 48
      }
    })

    expect(getDesktopWindowChrome('linux')).toMatchObject({
      backgroundColor: '#141414'
    })
    expect(getDesktopWindowChrome('linux')).not.toHaveProperty('titleBarOverlay')
  })

  it('reserves the correct title bar safe area for macOS traffic lights and Windows caption buttons', () => {
    expect(getTitlebarSafeArea('darwin')).toMatchObject({
      leftInset: 88,
      rightInset: 16
    })
    expect(getTitlebarSafeArea('win32')).toMatchObject({
      leftInset: 18,
      rightInset: 152
    })
  })

  it('detects desktop platforms from the renderer user agent', () => {
    expect(detectDesktopShellPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('win32')
    expect(detectDesktopShellPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(
      'darwin'
    )
    expect(detectDesktopShellPlatform('Mozilla/5.0 (X11; Linux x86_64)')).toBe('linux')
  })
})
