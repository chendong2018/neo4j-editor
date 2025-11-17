<template>
  <div class="log-viewer panel bg-dark-alt rounded-lg">
    <div class="panel-header">
      <h4 class="text-white">操作日志</h4>
      <div class="flex items-center space-x-2">
        <button 
          class="text-sm text-gray-400 hover:text-white"
          @click="clearLogs"
          :disabled="logs.length === 0"
        >
          清空
        </button>
        <button 
          class="text-sm text-gray-400 hover:text-white"
          @click="toggleAutoScroll"
        >
          {{ autoScroll ? '关闭自动滚动' : '开启自动滚动' }}
        </button>
      </div>
    </div>
    
    <div class="panel-content log-content" ref="logContainer">
      <div 
        v-for="(log, index) in logs" 
        :key="index"
        class="log-entry"
        :class="`log-${log.level}`"
      >
        <span class="log-time">{{ formatTime(log.timestamp) }}</span>
        <span class="log-level">{{ getLevelLabel(log.level) }}</span>
        <span class="log-message">{{ log.message }}</span>
      </div>
      <div v-if="logs.length === 0" class="no-logs">
        暂无日志记录
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

interface LogEntry {
  timestamp: number
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
}

// 接收日志数据
const props = defineProps<{
  logs: LogEntry[]
}>()

const emit = defineEmits<{
  clear: []
}>()

const logContainer = ref<HTMLElement | null>(null)
const autoScroll = ref(true)

// 格式化时间
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 获取日志级别标签
function getLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    info: '信息',
    success: '成功',
    warning: '警告',
    error: '错误'
  }
  return labels[level] || level
}

// 清空日志
function clearLogs() {
  emit('clear')
}

// 切换自动滚动
function toggleAutoScroll() {
  autoScroll.value = !autoScroll.value
}

// 监听日志变化，自动滚动到底部
watch(
  () => props.logs.length,
  () => {
    if (autoScroll.value && logContainer.value) {
      setTimeout(() => {
        logContainer.value!.scrollTop = logContainer.value!.scrollHeight
      }, 0)
    }
  }
)
</script>

<style scoped>
.log-content {
  max-height: 300px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 13px;
}

.log-entry {
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 10px;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: #888;
  font-size: 12px;
  min-width: 80px;
}

.log-level {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  min-width: 40px;
  text-align: center;
}

.log-info .log-level {
  background-color: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.log-success .log-level {
  background-color: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.log-warning .log-level {
  background-color: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.log-error .log-level {
  background-color: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.log-message {
  flex: 1;
  word-break: break-word;
}

.no-logs {
  color: #666;
  text-align: center;
  padding: 20px;
  font-style: italic;
}
</style>
