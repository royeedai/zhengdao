import { Extension, textInputRule } from '@tiptap/core'

export const TextReplaceExtension = Extension.create({
  name: 'textReplace',
  addInputRules() {
    return [
      textInputRule({ find: /\[\[$/, replace: '「' }),
      textInputRule({ find: /\]\]$/, replace: '」' }),
      textInputRule({ find: /--$/, replace: '——' }),
      textInputRule({ find: /\.\.\.$/, replace: '……' })
    ]
  }
})
