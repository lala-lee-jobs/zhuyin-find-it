/**
 * 統一的音檔對應表（路徑相對於 public/）。
 *
 * 注音發音必須是依教育部標準錄製的真人音檔。
 * 檔案不存在時，AudioService 會回報「缺音檔」，
 * 絕不改用瀏覽器 TTS 念單獨的聲母（TTS 常把 ㄅ 念成「ㄅㄛ」以外的怪音，甚至念出符號名稱）。
 *
 * 已預先列出完整 37 個注音，未來只要把音檔放進 public/audio/zhuyin/ 即可生效。
 */
export const ZHUYIN_AUDIO: Readonly<Record<string, string>> = {
  'ㄅ': 'audio/zhuyin/b.mp3',
  'ㄆ': 'audio/zhuyin/p.mp3',
  'ㄇ': 'audio/zhuyin/m.mp3',
  'ㄈ': 'audio/zhuyin/f.mp3',
  'ㄉ': 'audio/zhuyin/d.mp3',
  'ㄊ': 'audio/zhuyin/t.mp3',
  'ㄋ': 'audio/zhuyin/n.mp3',
  'ㄌ': 'audio/zhuyin/l.mp3',
  'ㄍ': 'audio/zhuyin/g.mp3',
  'ㄎ': 'audio/zhuyin/k.mp3',
  'ㄏ': 'audio/zhuyin/h.mp3',
  'ㄐ': 'audio/zhuyin/j.mp3',
  'ㄑ': 'audio/zhuyin/q.mp3',
  'ㄒ': 'audio/zhuyin/x.mp3',
  'ㄓ': 'audio/zhuyin/zh.mp3',
  'ㄔ': 'audio/zhuyin/ch.mp3',
  'ㄕ': 'audio/zhuyin/sh.mp3',
  'ㄖ': 'audio/zhuyin/r.mp3',
  'ㄗ': 'audio/zhuyin/z.mp3',
  'ㄘ': 'audio/zhuyin/c.mp3',
  'ㄙ': 'audio/zhuyin/s.mp3',
  'ㄧ': 'audio/zhuyin/i.mp3',
  'ㄨ': 'audio/zhuyin/u.mp3',
  'ㄩ': 'audio/zhuyin/yu.mp3',
  'ㄚ': 'audio/zhuyin/a.mp3',
  'ㄛ': 'audio/zhuyin/o.mp3',
  'ㄜ': 'audio/zhuyin/e.mp3',
  'ㄝ': 'audio/zhuyin/eh.mp3',
  'ㄞ': 'audio/zhuyin/ai.mp3',
  'ㄟ': 'audio/zhuyin/ei.mp3',
  'ㄠ': 'audio/zhuyin/ao.mp3',
  'ㄡ': 'audio/zhuyin/ou.mp3',
  'ㄢ': 'audio/zhuyin/an.mp3',
  'ㄣ': 'audio/zhuyin/en.mp3',
  'ㄤ': 'audio/zhuyin/ang.mp3',
  'ㄥ': 'audio/zhuyin/eng.mp3',
  'ㄦ': 'audio/zhuyin/er.mp3',
}

export type FeedbackKind = 'found' | 'try-again' | 'completed'

export const FEEDBACK_AUDIO: Readonly<Record<FeedbackKind, string>> = {
  found: 'audio/feedback/found.mp3',
  'try-again': 'audio/feedback/try-again.mp3',
  completed: 'audio/feedback/completed.mp3',
}

/** 畫面文字，同時也是音檔缺少時語音備援要念的句子 */
export const FEEDBACK_TEXT: Readonly<Record<FeedbackKind, string>> = {
  found: '找到了！',
  'try-again': '再找找看！',
  completed: '太棒了！全部找到了！',
}
