/**
 * 統一的音檔對應表（路徑相對於 public/）。
 *
 * 注音發音必須是依教育部標準錄製的真人音檔。
 * 檔案不存在時，AudioService 會回報「缺音檔」，
 * 絕不改用瀏覽器 TTS 念單獨的聲母（TTS 常把 ㄅ 念成「ㄅㄛ」以外的怪音，甚至念出符號名稱）。
 *
 * 檔名 F1–F37 的編號（與 public/audio/README.md 的對照表一致）：
 *   ㄅ ㄆ ㄇ ㄈ ㄉ ㄊ ㄋ ㄌ ㄍ ㄎ ㄏ ㄐ ㄑ ㄒ ㄓ ㄔ ㄕ ㄖ ㄗ ㄘ ㄙ（F1–F21）
 *   ㄚ ㄛ ㄜ ㄝ ㄞ ㄟ ㄠ ㄡ ㄢ ㄣ ㄤ ㄥ ㄦ（F22–F34）
 *   ㄧ ㄨ ㄩ（F35–F37）
 * 已預先列出完整 37 個注音，把音檔放進 public/audio/zhuyin/ 即可生效。
 */
export const ZHUYIN_AUDIO: Readonly<Record<string, string>> = {
  'ㄅ': 'audio/zhuyin/F1.wav',
  'ㄆ': 'audio/zhuyin/F2.wav',
  'ㄇ': 'audio/zhuyin/F3.wav',
  'ㄈ': 'audio/zhuyin/F4.wav',
  'ㄉ': 'audio/zhuyin/F5.wav',
  'ㄊ': 'audio/zhuyin/F6.wav',
  'ㄋ': 'audio/zhuyin/F7.wav',
  'ㄌ': 'audio/zhuyin/F8.wav',
  'ㄍ': 'audio/zhuyin/F9.wav',
  'ㄎ': 'audio/zhuyin/F10.wav',
  'ㄏ': 'audio/zhuyin/F11.wav',
  'ㄐ': 'audio/zhuyin/F12.wav',
  'ㄑ': 'audio/zhuyin/F13.wav',
  'ㄒ': 'audio/zhuyin/F14.wav',
  'ㄓ': 'audio/zhuyin/F15.wav',
  'ㄔ': 'audio/zhuyin/F16.wav',
  'ㄕ': 'audio/zhuyin/F17.wav',
  'ㄖ': 'audio/zhuyin/F18.wav',
  'ㄗ': 'audio/zhuyin/F19.wav',
  'ㄘ': 'audio/zhuyin/F20.wav',
  'ㄙ': 'audio/zhuyin/F21.wav',
  'ㄚ': 'audio/zhuyin/F22.wav',
  'ㄛ': 'audio/zhuyin/F23.wav',
  'ㄜ': 'audio/zhuyin/F24.wav',
  'ㄝ': 'audio/zhuyin/F25.wav',
  'ㄞ': 'audio/zhuyin/F26.wav',
  'ㄟ': 'audio/zhuyin/F27.wav',
  'ㄠ': 'audio/zhuyin/F28.wav',
  'ㄡ': 'audio/zhuyin/F29.wav',
  'ㄢ': 'audio/zhuyin/F30.wav',
  'ㄣ': 'audio/zhuyin/F31.wav',
  'ㄤ': 'audio/zhuyin/F32.wav',
  'ㄥ': 'audio/zhuyin/F33.wav',
  'ㄦ': 'audio/zhuyin/F34.wav',
  'ㄧ': 'audio/zhuyin/F35.wav',
  'ㄨ': 'audio/zhuyin/F36.wav',
  'ㄩ': 'audio/zhuyin/F37.wav',
}

export type FeedbackKind = 'found' | 'try-again' | 'completed' | 'break'

/**
 * 鼓勵語音：每種可以有好幾句，播放時隨機挑一句（不會連續兩次同一句）。
 * 新增語音：把檔案放進 public/audio/feedback/，再加到對應的陣列即可。
 */
export const FEEDBACK_AUDIO: Readonly<Record<FeedbackKind, readonly string[]>> = {
  found: ['audio/feedback/found-1.wav', 'audio/feedback/found-2.wav'],
  'try-again': ['audio/feedback/tryagain-1.wav', 'audio/feedback/tryagain-2.wav'],
  completed: ['audio/feedback/completed.wav'],
  /** 護眼休息提醒（Google AI Studio 生成後放進來；還沒有檔案時用裝置的中文語音念 FEEDBACK_TEXT.break） */
  break: ['audio/feedback/break.wav'],
}

/** 可以先沒有音檔的語音（缺檔時用裝置語音念出文字） */
export const OPTIONAL_FEEDBACK: readonly FeedbackKind[] = ['break']

/** 畫面文字，同時也是音檔缺少時語音備援要念的句子 */
export const FEEDBACK_TEXT: Readonly<Record<FeedbackKind, string>> = {
  found: '找到了！',
  'try-again': '再找找看！',
  completed: '太棒了！全部找到了！',
  break: '眼睛休息一下，我們去喝水、上廁所、抱抱爸爸媽媽吧！等等再來玩！',
}
