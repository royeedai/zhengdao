import { describe, expect, it } from 'vitest'
import {
  clampAiAssistantLauncherPosition,
  clampAiAssistantPanelRect,
  createDefaultAiAssistantLauncherPosition,
  createDefaultAiAssistantPanelRect,
  translateAiAssistantLauncherPosition,
  resizeAiAssistantPanelRectFromLeftEdge,
  resizeAiAssistantPanelRectFromRightEdge,
  resizeAiAssistantPanelRectFromTopLeft,
  resizeAiAssistantPanelRect,
  translateAiAssistantPanelRect
} from '../panel-layout'

describe('createDefaultAiAssistantPanelRect', () => {
  it('creates a panel rect that leaves room for the right context panel', () => {
    expect(createDefaultAiAssistantPanelRect(1440, 900)).toEqual({
      x: 644,
      y: 108,
      width: 420,
      height: 680
    })
  })
})

describe('clampAiAssistantPanelRect', () => {
  it('keeps the panel inside the viewport and enforces min/max size', () => {
    expect(
      clampAiAssistantPanelRect(
        { x: -80, y: -20, width: 1200, height: 900 },
        980,
        720
      )
    ).toEqual({
      x: 16,
      y: 16,
      width: 748,
      height: 688
    })
  })
})

describe('createDefaultAiAssistantLauncherPosition', () => {
  it('creates the collapsed launcher away from the right context panel', () => {
    expect(createDefaultAiAssistantLauncherPosition(1440, 900)).toEqual({
      x: 1016,
      y: 676
    })
  })
})

describe('clampAiAssistantLauncherPosition', () => {
  it('keeps the collapsed launcher inside the viewport', () => {
    expect(clampAiAssistantLauncherPosition({ x: 999, y: -24 }, 640, 480)).toEqual({
      x: 576,
      y: 16
    })
  })
})

describe('translateAiAssistantLauncherPosition', () => {
  it('moves the collapsed launcher but clamps it back into the viewport', () => {
    expect(
      translateAiAssistantLauncherPosition(
        { x: 560, y: 360 },
        200,
        200,
        640,
        480
      )
    ).toEqual({
      x: 576,
      y: 416
    })
  })
})

describe('translateAiAssistantPanelRect', () => {
  it('moves the panel but clamps it back into the viewport', () => {
    expect(
      translateAiAssistantPanelRect(
        { x: 600, y: 120, width: 420, height: 560 },
        500,
        400,
        1280,
        800
      )
    ).toEqual({
      x: 844,
      y: 224,
      width: 420,
      height: 560
    })
  })
})

describe('resizeAiAssistantPanelRect', () => {
  it('resizes from the bottom-right handle and preserves viewport bounds', () => {
    expect(
      resizeAiAssistantPanelRect(
        { x: 860, y: 160, width: 360, height: 520 },
        300,
        260,
        1280,
        820
      )
    ).toEqual({
      x: 860,
      y: 160,
      width: 404,
      height: 644
    })
  })
})

describe('resizeAiAssistantPanelRectFromTopLeft', () => {
  it('resizes from the top-left handle while keeping the bottom-right anchor stable', () => {
    expect(
      resizeAiAssistantPanelRectFromTopLeft(
        { x: 860, y: 160, width: 360, height: 520 },
        -200,
        -180,
        1280,
        820
      )
    ).toEqual({
      x: 660,
      y: 16,
      width: 560,
      height: 664
    })
  })
})

describe('resizeAiAssistantPanelRectFromLeftEdge', () => {
  it('resizes horizontally from the left edge while keeping the right edge stable', () => {
    expect(
      resizeAiAssistantPanelRectFromLeftEdge(
        { x: 860, y: 160, width: 360, height: 520 },
        -200,
        1280,
        820
      )
    ).toEqual({
      x: 660,
      y: 160,
      width: 560,
      height: 520
    })
  })
})

describe('resizeAiAssistantPanelRectFromRightEdge', () => {
  it('resizes horizontally from the right edge while preserving height', () => {
    expect(
      resizeAiAssistantPanelRectFromRightEdge(
        { x: 860, y: 160, width: 360, height: 520 },
        300,
        1280,
        820
      )
    ).toEqual({
      x: 860,
      y: 160,
      width: 404,
      height: 520
    })
  })
})
