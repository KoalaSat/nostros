import { StyleSheet } from 'react-native'
import { MarkdownIt } from 'react-native-markdown-display'

export const markdownStyle: (theme: Record<string, string>) => StyleSheet.NamedStyles<any> = (
  theme,
) => {
  return {
    text: {
      color: theme['text-basic-color'],
    },
    tr: {
      borderColor: theme['border-primary-color-5'],
    },
    table: {
      borderColor: theme['border-primary-color-5'],
    },
    blocklink: {
      borderColor: theme['border-primary-color-5'],
    },
    hr: {
      backgroundColor: theme['background-basic-color-3'],
    },
    blockquote: {
      backgroundColor: theme['background-basic-color-3'],
      borderColor: theme['border-primary-color-5'],
      color: theme['text-basic-color'],
    },
    code_inline: {
      borderColor: theme['border-primary-color-5'],
      backgroundColor: theme['background-basic-color-3'],
      color: theme['text-basic-color'],
    },
    code_block: {
      borderColor: theme['border-primary-color-5'],
      backgroundColor: theme['background-basic-color-3'],
      color: theme['text-basic-color'],
    },
    fence: {
      borderColor: theme['border-primary-color-5'],
      backgroundColor: theme['background-basic-color-3'],
      color: theme['text-basic-color'],
    },
  }
}

export const markdownIt = new MarkdownIt({
  linkify: true,
})
