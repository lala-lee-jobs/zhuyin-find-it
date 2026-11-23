export interface VocabWord {
  word: string
  illustration: string
}

export const VOCAB_WORDS: Record<string, VocabWord[]> = {
  'ㄅ': [
    { word: '包子', illustration: './illustrations/bun.svg' },
    { word: '爸爸', illustration: './illustrations/dad.svg' },
    { word: '斑馬', illustration: './illustrations/zebra.svg' },
    { word: '棉被', illustration: './illustrations/blanket.svg' },
  ],
}
