<script setup lang="ts">
/** 線稿風格的 SVG 圖示（不使用 Emoji，避免不同平台顯示不一致） */
withDefaults(
  defineProps<{
    name:
      | 'speaker'
      | 'speaker-off'
      | 'brush'
      | 'eraser'
      | 'undo'
      | 'trash'
      | 'restart'
      | 'prev'
      | 'next'
      | 'close'
      | 'star'
      | 'palette'
      | 'replay'
      | 'epaper'
      | 'brush-sound'
      | 'brush-sound-off'
    size?: number
  }>(),
  { size: 28 },
)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    stroke-width="2.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'speaker'">
      <path d="M5 12h5l7-6v20l-7-6H5z" fill="#fff" />
      <path d="M21 11.5a6 6 0 0 1 0 9" />
      <path d="M24.5 8a11 11 0 0 1 0 16" />
    </template>
    <template v-else-if="name === 'speaker-off'">
      <path d="M5 12h5l7-6v20l-7-6H5z" fill="#fff" />
      <path d="M21 12l7 8M28 12l-7 8" />
    </template>
    <template v-else-if="name === 'brush'">
      <path d="M20 4l8 8-11 11-8-8z" fill="#fff" />
      <path d="M9 15c-4 1-5 4-5 6 0 3-1 5-2 6 4 0 9-1 11-4 1-1 1-3 1-3" fill="#fff" />
    </template>
    <template v-else-if="name === 'eraser'">
      <path d="M4 20l12-12 10 10-8 8H10z" fill="#fff" />
      <path d="M10 14l9 9M14 26h14" />
    </template>
    <template v-else-if="name === 'undo'">
      <path d="M11 7L5 13l6 6" />
      <path d="M5 13h13a8 8 0 0 1 0 16h-5" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M6 9h20M13 9V5h6v4M8 9l1.5 18h13L24 9" fill="#fff" />
      <path d="M13 14v9M19 14v9" />
    </template>
    <template v-else-if="name === 'restart'">
      <path d="M26 16a10 10 0 1 1-3-7" />
      <path d="M24 3v7h-7" />
    </template>
    <template v-else-if="name === 'replay'">
      <path d="M6 16a10 10 0 1 0 3-7" />
      <path d="M8 3v7h7" />
      <path d="M14 12l6 4-6 4z" fill="currentColor" />
    </template>
    <template v-else-if="name === 'prev'">
      <path d="M20 6L10 16l10 10" />
    </template>
    <template v-else-if="name === 'next'">
      <path d="M12 6l10 10-10 10" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M8 8l16 16M24 8L8 24" />
    </template>
    <template v-else-if="name === 'star'">
      <path d="M16 3l3.8 8 8.7 1-6.4 6 1.7 8.6L16 22.4 8.2 26.6 9.9 18 3.5 12l8.7-1z" fill="currentColor" />
    </template>
    <template v-else-if="name === 'epaper'">
      <rect x="7" y="3.5" width="18" height="25" rx="3" fill="#fff" />
      <path d="M11 9h10M11 13.5h10M11 18h6" />
      <circle cx="16" cy="24" r="1.4" fill="currentColor" />
    </template>
    <template v-else-if="name === 'brush-sound' || name === 'brush-sound-off'">
      <!-- 筆畫線（沙沙的筆跡）＋右側聲波；關閉時加一道斜線 -->
      <path d="M3 22c2.5-5 4.5 1 7-3s4 1 6-2" />
      <template v-if="name === 'brush-sound'">
        <path d="M21 12.5a5 5 0 0 1 0 7" />
        <path d="M24.5 9a10 10 0 0 1 0 14" />
      </template>
      <path v-else d="M20 10l9 12" />
    </template>
    <template v-else-if="name === 'palette'">
      <path
        d="M16 4C9 4 4 9 4 15.5S9 28 15 28c2 0 2.5-1.5 2-3-.6-1.7.6-3 2.4-3H23c3 0 5-2 5-5.2C28 9 23 4 16 4z"
        fill="#fff"
      />
      <circle cx="10" cy="14" r="1.8" fill="currentColor" />
      <circle cx="15" cy="9.5" r="1.8" fill="currentColor" />
      <circle cx="21" cy="10.5" r="1.8" fill="currentColor" />
    </template>
  </svg>
</template>
