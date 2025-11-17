<template>
  <aside class="w-64 bg-dark-light border-r border-gray-800 flex flex-col">
    <!-- Node Types Panel -->
    <div class="panel">
      <div class="panel-header">
        <span>Node Types</span>
        <button 
          id="add-node-type-btn" 
          class="text-xs bg-accent hover:bg-blue-600 text-white py-1 px-2 rounded"
          @click="$emit('addNodeType')"
        >
          <i class="fa fa-plus mr-1"></i> Add
        </button>
      </div>
      <div class="panel-content">
        <div 
          v-for="nodeType in nodeTypes" 
          :key="nodeType.name"
          class="node-type-btn" 
          :class="{ active: activeNodeType === nodeType.name }"
          :data-type="nodeType.name"
          @click="$emit('selectNodeType', nodeType.name)"
        >
          <i :class="`fa ${nodeType.icon} node-type-icon`"></i>
          <span>{{ nodeType.name }}</span>
        </div>
      </div>
    </div>
    
    <!-- Relationship Types Panel -->
    <div class="panel border-t border-gray-800">
      <div class="panel-header">
        <span>Relationship Types</span>
        <button 
          id="add-relationship-type-btn" 
          class="text-xs bg-accent hover:bg-blue-600 text-white py-1 px-2 rounded"
          @click="$emit('addRelationshipType')"
        >
          <i class="fa fa-plus mr-1"></i> Add
        </button>
      </div>
      <div class="panel-content">
        <div 
          v-for="relType in relationshipTypes" 
          :key="relType.name"
          class="node-type-btn" 
          :class="{ active: activeRelationshipType === relType.name }"
          :data-type="relType.name"
          @click="$emit('selectRelationshipType', relType.name)"
        >
          <i :class="`fa ${relType.icon} node-type-icon`"></i>
          <span>{{ relType.name }}</span>
        </div>
      </div>
    </div>
    
    <!-- Label Filter Panel -->
    <!-- <div class="panel border-t border-gray-800">
      <div class="panel-header">
        <span>Label Filters</span>
      </div>
      <div class="panel-content">
        <div id="label-filter-container" class="space-y-2">
          <div v-if="!labels.length" class="text-xs text-gray-400">
            加载标签中...
          </div>
          <div 
            v-for="label in labels" 
            :key="label"
            class="flex items-center justify-between"
          >
            <label class="flex items-center text-sm">
              <input 
                type="checkbox" 
                :value="label"
                v-model="props.activeLabels"
                class="mr-2"
              >
              {{ label }}
            </label>
            <span class="text-xs text-gray-400">({{ getLabelCount(label) }})</span>
          </div>
        </div>
      </div>
    </div> -->
    
    <!-- Tools Panel -->
    <div class="panel border-t border-gray-800 mt-auto">
      <div class="panel-header">
        <span>Tools</span>
      </div>
      <div class="panel-content">
        <button 
          id="delete-btn" 
          class="w-full flex items-center justify-center p-2 text-red-500 hover:bg-red-900 hover:bg-opacity-20 rounded mb-2"
          @click="$emit('deleteSelected')"
        >
          <i class="fa fa-trash mr-2"></i> Delete
        </button>
        <button 
          id="clear-btn" 
          class="w-full flex items-center justify-center p-2 text-yellow-500 hover:bg-yellow-900 hover:bg-opacity-20 rounded mb-2"
          @click="$emit('clearAll')"
        >
          <i class="fa fa-eraser mr-2"></i> Clear All
        </button>
        <button 
          id="export-btn" 
          class="w-full flex items-center justify-center p-2 text-green-500 hover:bg-green-900 hover:bg-opacity-20 rounded mb-2"
          @click="$emit('exportGraph')"
        >
          <i class="fa fa-download mr-2"></i> Export Graph
        </button>
        <button 
          id="export-neo4j-btn" 
          class="w-full flex items-center justify-center p-2 text-blue-500 hover:bg-blue-900 hover:bg-opacity-20 rounded"
          @click="$emit('exportNeo4j')"
        >
          <i class="fa fa-database mr-2"></i> Export Neo4j
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import type { NodeType, RelationshipType, Node } from '../../types/graph'

// Props
const props = defineProps({
  nodeTypes: {
    type: Array as PropType<NodeType[]>,
    default: () => []
  },
  relationshipTypes: {
    type: Array as PropType<RelationshipType[]>,
    default: () => []
  },
  labels: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  activeLabels: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  activeNodeType: {
    type: String,
    default: ''
  },
  activeRelationshipType: {
    type: String,
    default: ''
  },
  nodes: {
    type: Array as PropType<Node[]>,
    default: () => []
  }
})

// Emits
const emit = defineEmits<{
  addNodeType: []
  addRelationshipType: []
  selectNodeType: [type: string]
  selectRelationshipType: [type: string]
  deleteSelected: []
  clearAll: []
  exportGraph: []
  exportNeo4j: []
}>()

// // 获取标签计数
// function getLabelCount(label: string) {
//   return props.nodes.filter(node => {
//     // 检查节点是否有labels数组，并且数组中包含指定标签
//     if (Array.isArray(node.labels)) {
//       return node.labels.includes(label)
//     }
//     // 兼容旧数据格式
//     return node.label === label
//   }).length
// }
</script>

<style scoped>
.panel {
  flex: 0 0 auto;
}

.panel-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.2);
  font-weight: 500;
}

.panel-content {
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.node-type-btn {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.node-type-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.node-type-btn.active {
  background-color: rgba(33, 150, 243, 0.2);
  border-left: 3px solid #2196F3;
}

.node-type-icon {
  margin-right: 8px;
  font-size: 16px;
}

/* 自定义滚动条 */
.panel-content {
  scrollbar-width: thin;
}

.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.panel-content::-webkit-scrollbar-thumb {
  background-color: #333333;
  border-radius: 3px;
}
</style>