export interface PlatformPreset {
  id: string
  name: string
  description: string
  indent: boolean
  blankLineBetweenParagraphs: boolean
  removeExtraSpaces: boolean
  encoding: string
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: 'qidian',
    name: '起点中文网',
    description: '两格缩进、段间空行',
    indent: true,
    blankLineBetweenParagraphs: true,
    removeExtraSpaces: true,
    encoding: 'utf-8'
  },
  {
    id: 'zongheng',
    name: '纵横中文网',
    description: '两格缩进、无空行',
    indent: true,
    blankLineBetweenParagraphs: false,
    removeExtraSpaces: true,
    encoding: 'utf-8'
  },
  {
    id: 'fanqie',
    name: '番茄小说',
    description: '两格缩进、段间空行',
    indent: true,
    blankLineBetweenParagraphs: true,
    removeExtraSpaces: true,
    encoding: 'utf-8'
  },
  {
    id: 'custom',
    name: '自定义',
    description: '自选格式选项',
    indent: true,
    blankLineBetweenParagraphs: true,
    removeExtraSpaces: false,
    encoding: 'utf-8'
  }
]

export function getPresetById(id: string): PlatformPreset {
  return PLATFORM_PRESETS.find((p) => p.id === id) || PLATFORM_PRESETS[0]!
}
