export interface VocabWord {
  word: string
  /** 包含目標注音的那個字，發音時唸「詞 → keyChar → 注音」 */
  keyChar: string
  illustration: string
}

export const VOCAB_WORDS: Record<string, VocabWord[]> = {
  'ㄅ': [
    { word: '包子', keyChar: '包', illustration: './illustrations/bun.svg' },
    { word: '爸爸', keyChar: '爸', illustration: './illustrations/dad.svg' },
    { word: '斑馬', keyChar: '斑', illustration: './illustrations/zebra.svg' },
    { word: '棉被', keyChar: '被', illustration: './illustrations/blanket.svg' },
  ],
}
