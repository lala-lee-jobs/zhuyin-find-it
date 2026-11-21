<script setup lang="ts">
/**
 * 畫筆工具列：顏色、粗細、橡皮擦、復原、清除塗色、重新開始本題。
 * 平板：完整顯示（橫向放右側、直向放下方）；手機：可收合。
 */
import { computed, ref } from 'vue'
import type { BrushSettings } from '../types/worksheet'
import { BRUSH_COLORS, BRUSH_WIDTHS } from '../core/strokes'
import { displayColor } from '../core/palette'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  brush: BrushSettings
  canUndo: boolean
  canClear: boolean
  vertical: boolean
  collapsible: boolean
  epaper: boolean
  /** 筆刷音效是否開啟 */
  brushSound: boolean
}>()
const emit = defineEmits<{
  (e: 'update:brush', patch: Partial<BrushSettings>): void
  (e: 'undo'): void
  (e: 'clear'): void
  (e: 'restart'): void
  (e: 'toggle-brush-sound'): void
}>()

const collapsed = ref(false)
const isCollapsed = computed(() => props.collapsible && collapsed.value)
const currentColorName = computed(() => BRUSH_COLORS.find((c) => c.value === props.brush.color)?.name ?? '')

/** 畫面上顯示的顏色（電子紙模式會換成飽和色） */
const shown = (color: string) => displayColor(color, props.epaper)

function pickColor(value: string): void {
  emit('update:brush', { color: value, tool: 'brush' })
}
</script>

<template>
  <nav class="toolbar" :class="{ vertical, collapsed: isCollapsed }" aria-label="畫筆工具">
    <button
      v-if="collapsible"
      type="button"
      class="tool toggle"
      :aria-expanded="!isCollapsed"
      :aria-label="isCollapsed ? '打開畫筆工具' : '收起畫筆工具'"
      @click="collapsed = !collapsed"
    >
      <span class="current-dot" :style="{ background: brush.tool === 'eraser' ? '#fff' : shown(brush.color) }">
        <AppIcon v-if="brush.tool === 'eraser'" name="eraser" :size="22" />
      </span>
    </button>

    <template v-if="!isCollapsed">
      <div class="group colors" role="radiogroup" aria-label="顏色">
        <button
          v-for="c in BRUSH_COLORS"
          :key="c.value"
          type="button"
          role="radio"
          class="swatch"
          :class="{ active: brush.tool === 'brush' && brush.color === c.value }"
          :style="{ background: shown(c.value) }"
          :aria-checked="brush.tool === 'brush' && brush.color === c.value"
          :aria-label="c.name"
          @click="pickColor(c.value)"
        />
      </div>

      <div class="group sizes" role="radiogroup" aria-label="粗細">
        <button
          v-for="w in BRUSH_WIDTHS"
          :key="w.value"
          type="button"
          role="radio"
          class="tool size"
          :class="{ active: brush.width === w.value }"
          :aria-checked="brush.width === w.value"
          :aria-label="`${w.name}筆`"
          @click="emit('update:brush', { width: w.value })"
        >
          <span
            class="size-dot"
            :style="{
              width: `${8 + w.value / 2.4}px`,
              height: `${8 + w.value / 2.4}px`,
              background: brush.tool === 'eraser' ? '#ccc' : shown(brush.color),
            }"
          />
        </button>
      </div>

      <div class="group actions">
        <button
          type="button"
          class="tool"
          :class="{ active: brush.tool === 'eraser' }"
          :aria-pressed="brush.tool === 'eraser'"
          aria-label="橡皮擦"
          title="橡皮擦"
          @click="emit('update:brush', { tool: brush.tool === 'eraser' ? 'brush' : 'eraser' })"
        >
          <AppIcon name="eraser" />
        </button>
        <button type="button" class="tool" :disabled="!canUndo" aria-label="復原上一筆" title="復原上一筆" @click="emit('undo')">
          <AppIcon name="undo" />
        </button>
        <button type="button" class="tool" :disabled="!canClear" aria-label="清除塗色" title="清除塗色" @click="emit('clear')">
          <AppIcon name="trash" />
        </button>
        <button type="button" class="tool" aria-label="重新開始本題" title="重新開始本題" @click="emit('restart')">
          <AppIcon name="restart" />
        </button>
        <button
          type="button"
          class="tool"
          :class="{ active: brushSound }"
          :aria-pressed="brushSound"
          aria-label="筆刷音效"
          :title="brushSound ? '筆刷音效：開' : '筆刷音效：關'"
          @click="emit('toggle-brush-sound')"
        >
          <AppIcon :name="brushSound ? 'brush-sound' : 'brush-sound-off'" />
        </button>
      </div>
      <span class="sr-only" aria-live="polite">{{ brush.tool === 'eraser' ? '橡皮擦' : currentColorName }}</span>
    </template>
  </nav>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px 14px;
  padding: 8px 10px;
  background: #fff;
  border: 3px solid var(--ink);
  border-radius: 24px;
  box-shadow: 0 3px 0 var(--ink);
}
.toolbar.vertical {
  flex-direction: column;
  flex-wrap: nowrap;
  padding: 12px 8px;
}
.toolbar.collapsed {
  padding: 6px;
}
.group {
  display: flex;
  gap: 8px;
  align-items: center;
}
.vertical .group {
  flex-direction: column;
}
.vertical .colors {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}
.swatch {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid var(--ink);
  padding: 0;
  transition: transform 0.15s ease;
}
.swatch.active {
  transform: scale(1.12);
  box-shadow:
    0 0 0 3px #fff,
    0 0 0 6px var(--ink);
}
.tool {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: 16px;
  border: 3px solid var(--ink);
  background: #fff;
  color: var(--ink);
  box-shadow: 0 3px 0 var(--ink);
}
.tool:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--ink);
}
.tool.active {
  background: var(--accent-soft);
}
.tool:disabled {
  opacity: 0.35;
  box-shadow: none;
}
.size-dot {
  display: block;
  border-radius: 50%;
  border: 2px solid var(--ink);
}
.toggle {
  border-radius: 50%;
}
.current-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid var(--ink);
  display: grid;
  place-items: center;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
@media (max-width: 420px) {
  .swatch {
    width: 38px;
    height: 38px;
  }
  .tool {
    width: 46px;
    height: 46px;
  }
  .toolbar {
    gap: 8px 10px;
  }
}
</style>
