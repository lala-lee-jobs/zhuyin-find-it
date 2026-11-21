import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

// 長按不跳出選單（Android 長按、桌機右鍵）、不開始選取文字、不拖曳圖片
for (const type of ['contextmenu', 'selectstart', 'dragstart'] as const) {
  document.addEventListener(type, (e) => e.preventDefault())
}

createApp(App).mount('#app')
