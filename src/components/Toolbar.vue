<template>
  <div id="toolbar" class="bg-dark-light py-2 px-4 border-b border-gray-800 flex justify-between items-center">
    <div class="flex space-x-2">
      <!-- 视图切换按钮组 - 确保互斥选择 -->
      <button 
        id="split-view-btn" 
        class="text-white py-1 px-3 rounded text-sm bg-gray-700"
        :class="{ active: currentViewMode === 'dual' }"
        @click="$emit('switchViewMode', 'dual')"
      >
        <i class="fa fa-columns mr-1"></i> 双视图模式
      </button>
      <button 
        id="tree-only-btn" 
        class="text-white py-1 px-3 rounded text-sm bg-gray-700"
        :class="{ active: currentViewMode === 'tree' }"
        @click="$emit('switchViewMode', 'tree')"
      >
        <i class="fa fa-sitemap mr-1 text-purple-400"></i> 仅树视图
      </button>
      <button 
        id="network-only-btn" 
        class="text-white py-1 px-3 rounded text-sm bg-gray-700"
        :class="{ active: currentViewMode === 'network' }"
        @click="$emit('switchViewMode', 'network')"
      >
        <i class="fa fa-share-alt mr-1"></i> 仅网络图视图
      </button>
      <span class="border-r border-gray-600 h-5"></span>
      <!-- <button 
        id="select-mode-btn" 
        class="bg-accent hover:bg-blue-600 text-white py-1 px-3 rounded text-sm"
        :class="{ active: currentMode === 'select' }"
        @click="$emit('switchMode', 'select')"
      >
        <i class="fa fa-mouse-pointer mr-1"></i> Select
      </button> -->
      <button 
        id="node-mode-btn" 
        class="bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
        :class="{ active: currentMode === 'node', disabled: !selectedNode?.id }"
        :disabled="!selectedNode?.id"
        @click="selectedNode?.id && $emit('switchMode', currentMode === 'node' ? 'select' : 'node')"
      >
        <i class="fa fa-circle-o mr-1"></i> Node
      </button>
      <button 
        id="relationship-mode-btn" 
        class="bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
        :class="{ active: currentMode === 'relationship', disabled: !selectedNode?.id }"
        :disabled="!selectedNode?.id"
        @click="selectedNode?.id && $emit('switchMode', currentMode === 'relationship' ? 'select' : 'relationship')"
      >
        <i class="fa fa-long-arrow-right mr-1"></i> 
        <template v-if="relationshipCreationMode.isActive && relationshipCreationMode.提示信息">
          {{ relationshipCreationMode.提示信息 }}
        </template>
        <template v-else>
          Relationship
        </template>
      </button>
    </div>
    <div class="text-sm text-gray-400">
      <span id="node-count">{{ nodeCount }} nodes</span> | <span id="edge-count">{{ edgeCount }} edges</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { ViewMode, EditorMode } from '../types/graph'

// Props
const props = defineProps({
  currentViewMode: {
    type: String as PropType<ViewMode>,
    required: true
  },
  currentMode: {
    type: String as PropType<EditorMode>,
    required: true
  },
  nodeCount: {
    type: Number,
    default: 0
  },
  edgeCount: {
    type: Number,
    default: 0
  },
  selectedNode: {
    type: Object,
    default: null
  },
  relationshipCreationMode: {
    type: Object,
    default: () => ({
      isActive: false,
      提示信息: ''
    })
  }
})

// Emits
const emit = defineEmits<{
  switchViewMode: [mode: ViewMode]
  switchMode: [mode: EditorMode]
}>()
</script>

<style scoped>
#toolbar {
  flex-shrink: 0;
}

button {
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

button.active {
  background-color: #2196F3 !important;
}

button:hover:not(.active):not(:disabled) {
  background-color: #555555 !important;
  opacity: 0.9;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #374151 !important;
}

button:disabled:hover {
  opacity: 0.5;
}

/* 响应式调整 */
@media (max-width: 768px) {
  #toolbar {
    flex-direction: column;
    padding: 8px;
    gap: 8px;
  }
  
  .flex.space-x-2 {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  button {
    font-size: 12px;
    padding: 6px 12px;
  }
}
</style>