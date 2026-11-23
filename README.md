# 注音找找看（互動式 Canvas 學習單）

把黑白紙本「找找看注音」學習單變成可以塗色、點選、聽發音的數位學習單。給 3–6 歲幼兒自主探索，沒有計時、扣分或排名。

**線上玩**：https://lala-lee-jobs.github.io/zhuyin-find-it/

- 中央大注音：用手指／觸控筆／滑鼠自由塗色，顏色**只會出現在注音裡面**。
- 周圍 22 個注音圓圈：點一下 → 先聽發音 → 再看「找到了！」或「再找找看！」。
- 兩個活動完全獨立：先塗先找都可以，找完後也可以繼續塗。
- 37 個注音全部完成（ㄅ～ㄦ），大人可在設定中選擇開放範圍。
- 護眼提醒：每隔設定的分鐘數提醒休息，休息畫面會蓋住整個畫面直到按下「我休息好了！」。
- **PWA**：第一次載入後所有資源都快取到裝置，之後**離線也能玩**；可加到主畫面像 App 一樣開啟。

## 安裝與啟動

需要 Node.js 18.18 以上。

```bash
npm install
npm run dev        # 開發伺服器（加 --host 可用平板連線測試）
npm run build      # 輸出到 dist/，可放在任何靜態主機或子目錄
npm run preview    # 預覽 build 結果
npm run test       # Vitest 單元測試
npm run typecheck  # vue-tsc 型別檢查（獨立指令，不擋 build）
```

## 專案結構

```
src/
├── App.vue                      組合所有元件、題目切換、確認對話框
├── components/
│   ├── WorksheetCanvas.vue      三層 Canvas + 指標事件分流（圓圈 / 畫筆）
│   ├── WorksheetHeader.vue      標題喇叭按鈕（HTML overlay）
│   ├── DrawingToolbar.vue       顏色、粗細、橡皮擦、復原、清除、重新開始
│   ├── AnswerPopup.vue          點擊圓圈後的 Popup
│   ├── CompletionPopup.vue      全部找到的獎勵畫面
│   ├── WorksheetSelector.vue    上一題／下一題／注音選擇
│   ├── ProgressIndicator.vue    「已找到 5 / 7 個 ㄌ」＋星星
│   ├── ConfirmDialog.vue        清除／重新開始前確認
│   ├── SettingsDialog.vue       大人設定（長按 1 秒才打開）
│   ├── BreakPopup.vue           護眼休息提醒畫面（全螢幕覆蓋）
│   ├── PwaBanner.vue            PWA 就緒時的一次性安裝提示
│   ├── ZhuyinGlyph.vue          SVG 注音（與 Canvas 同一份骨架資料）
│   └── AppIcon.vue              線稿圖示
├── composables/
│   ├── useWorksheetState.ts     題目、進度、畫筆設定、自動儲存
│   ├── useCircleInteraction.ts  狀態機的 Vue 包裝
│   ├── useCanvasDrawing.ts      畫筆筆畫與離屏合成
│   ├── useAudio.ts              共用 AudioService、標題喇叭、塗色音效
│   ├── useBreakReminder.ts      護眼計時（僅累計畫面可見時間）
│   └── useStageFit.ts           等比例縮放、方向、devicePixelRatio
├── canvas/
│   ├── layout.ts                800×1100 邏輯座標版面
│   ├── renderWorksheet.ts       Layer 1：紙張、標題、插畫、裝飾
│   ├── drawingMask.ts           Layer 2–4：遮罩合成（GlyphPaintSurface）
│   ├── renderZhuyin.ts          實心注音／泡泡字外框／遮罩
│   ├── renderCircles.ts         Layer 5–6：圓圈、填色動畫
│   ├── renderDecorations.ts     星星、愛心、小花、雲朵、草叢
│   ├── glyphGeometry.ts         骨架解析、注音命中測試
│   ├── hitTesting.ts            圓圈命中測試
│   ├── coordinateUtils.ts       螢幕座標 ↔ 邏輯座標、DPR
│   └── imageCache.ts            插畫載入
├── core/                        與 Vue 無關、可單獨測試
│   ├── CircleInteractionController.ts   idle→pronouncing→feedback→closing 狀態機
│   ├── palette.ts               亮色／電子紙雙配色
│   ├── playTimer.ts             護眼計時純函式
│   ├── progress.ts              進度純函式
│   ├── strokes.ts               筆畫資料、畫筆顏色與粗細
│   └── random.ts                seeded random
├── services/
│   ├── AudioService.ts          音檔播放、逾時、中止、語音備援
│   ├── BrushSound.ts            塗色筆畫音效
│   └── StorageService.ts        localStorage（含版本欄位）
├── data/
│   ├── worksheets.ts            題庫種子 → 題目（37 題，預設開放前 27 題）
│   ├── zhuyinGlyphs.ts          注音骨架路徑（SVG 用）
│   ├── zhuyinGlyphs/            注音骨架圖（PNG，Canvas 用，37 張）
│   ├── zhuyinGlyphImages.ts     注音圖檔 import 匯總
│   ├── zhuyinAudioMap.ts        音檔對應表（37 個注音）
│   └── credits.ts               素材來源清單
└── types/worksheet.ts
public/
├── illustrations/               54 張 SVG 插畫（三個主題風格）
├── audio/                       音檔（注音 F1–F37.wav；回饋音效）
├── icon-192.png                 PWA 主畫面圖示（192×192）
└── icon-512.png                 PWA 主畫面圖示（512×512）
tests/                           Vitest（單元測試）
```

## 關鍵設計

**中央注音的形狀用「骨架路徑」而不是字型。** 各平台注音字型差異很大，字型描邊也會有內部交疊。改用 `data/zhuyinGlyphs.ts` 中的中心線路徑，以圓頭粗線畫出泡泡字：
- 外框 = 骨架以 60 單位寬描黑、再挖掉 46 單位寬的內部；
- 遮罩 = 骨架以 50 單位寬描繪（比可塗色區略寬，顏色延伸到黑框底下不留白縫）；
- 命中測試 = 點到骨架的距離 ≤ 線寬一半。三者用同一份幾何，保證一致。
同一份路徑也用在圓圈、標題與 Popup（SVG），所以每台裝置看起來都一樣。

**遮罩合成（drawingMask.ts）**：孩子的筆畫畫在離屏 `paint` 上（橡皮擦是 `destination-out`，只作用在這層）；每一幀把 `paint` 複製到 `scratch`、以 `destination-in` 套上遮罩、畫到螢幕，最後才畫黑色外框。所以塗色不會出界、橡皮擦擦不到輪廓、外框永遠清晰。

**指標事件分流**：按下時先檢查圓圈，再檢查中央注音（`setPointerCapture`），其他區域不動作。圓圈在「放開時仍在同一圓內、且移動 < 26 單位」才算點擊，避免滑動誤觸；畫筆開始後整筆都屬於畫筆，經過圓圈也不會答題。座標以 `getBoundingClientRect` 換算，與 CSS 縮放及 devicePixelRatio 無關。

**先聽再看**：狀態機在 `playSymbol` 結束（或失敗、逾時 6 秒）後才呼叫 `evaluate`，結果與 `feedback` 狀態同一次更新。非 `idle` 時忽略所有點擊；換題時 `cancel()` 讓舊流程的回呼失效。

**iOS 自動播放**：圓圈點擊在 `pointerup` 中同步一路呼叫到 `audio.play()`，並重複使用同一個 `<audio>` 元素，第一次解鎖後回饋語音也能播放。

**大人設定（長按保護）**：設定按鈕需要長按 1 秒才打開，避免幼兒誤觸。按住時按鈕有由下往上的填色動畫提示進度；鍵盤 Enter 直接打開（鍵盤通常不在幼兒手邊）。

## 尚缺的資源

- **圓體字型**：標題與 UI 依序使用 Yuanti TC、jf 粉圓、PingFang TC、Noto Sans TC。若要每台裝置都一致，可在 `index.html` 加入自架的粉圓字型（OFL 授權）。注音本身不依賴字型。

## 已知限制

- 圓圈畫在 Canvas 上，鍵盤與螢幕閱讀器無法逐一操作圓圈（標題喇叭與工具列可以）。
- 骨架字形是依注音字源手工設計，請以教育部標準字體再確認筆形，必要時微調 `zhuyinGlyphs.ts`。
- ㄈ 的「蜜蜂」、ㄋ 的「小鳥」目標注音不在第一個字（沿用參考學習單的選詞方式），可視需要替換。
- 筆畫數量沒有上限；極長時間塗色會讓 localStorage 變大（已四捨五入到 0.1 單位）。

## 後續擴充建議

1. **插畫點擊發音**：`IllustrationItem` 已預留 `zhuyin`、`audioUrl`，在 Canvas 指標分流中加入插畫區的命中判斷即可。
2. **難度**：種子加入 `distractors` 數量與 `correctCount` 的難度設定（例如只用形狀差異大的干擾注音）。
3. **A4 列印**：`renderBase` + `renderCircles` 已是純函式，可在 2480×3508 的離屏 Canvas 上以 `k = 3.1` 輸出。
4. **學習紀錄**：`WorksheetProgress` 可加上完成時間；`StorageService.migrate` 已預留版本遷移。

## 素材來源與授權

注音發音音檔（`public/audio/zhuyin/F1.wav`–`F37.wav`）取自教育部《注音符號手冊》：
https://language.moe.gov.tw/001/Upload/files/site_content/M0001/juyin/index.html

- 著作人：中華民國教育部
- 授權：手冊內含的注音符號動畫 XML、SVG 檔與相關音檔，採「[創用CC 姓名標示 4.0 國際版本](https://creativecommons.org/licenses/by/4.0/deed.zh_TW)」（CC BY 4.0）授權提供；利用這些檔案視為符合政府資料開放授權條款。
- 手冊本身（文字與版面）是「創用CC 姓名標示–禁止改作 3.0 臺灣」授權，本專案沒有使用手冊內容，只使用另外提供的音檔。
- 依 CC BY 4.0，使用音檔時要保留上面的來源與授權標示；如果之後剪輯、轉檔或調整音量，要再註明「已修改」。
