# 音檔放置說明

目前**沒有附任何音檔**。請放入依教育部標準錄製的真人發音（建議 mp3，44.1kHz，單聲道，前後靜音 < 100ms）。

```
audio/
├── zhuyin/        注音發音（檔名對照 src/data/zhuyinAudioMap.ts）
│   ├── b.mp3  ㄅ     ├── d.mp3  ㄉ
│   ├── p.mp3  ㄆ     ├── t.mp3  ㄊ
│   ├── m.mp3  ㄇ     ├── n.mp3  ㄋ
│   ├── f.mp3  ㄈ     └── l.mp3  ㄌ
└── feedback/      鼓勵語音
    ├── found.mp3       「找到了！」
    ├── try-again.mp3   「再找找看！」
    └── completed.mp3   「太棒了！全部找到了！」
```

缺檔時的行為：

- 注音：Popup 仍顯示符號並註明「尚未加入發音音檔」，**不會**改用瀏覽器 TTS（避免念錯）。
- 鼓勵語：若裝置有中文語音，使用 Web Speech API 念出鼓勵句；沒有就只顯示文字。
- 任何情況都不會讓互動卡住。
