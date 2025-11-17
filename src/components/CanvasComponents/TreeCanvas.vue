<template>
  <div class="canvas-container">
    <div class="absolute top-2 left-2 bg-dark-light bg-opacity-90 px-2 py-1 rounded text-sm">
      <i class="fa fa-sitemap mr-1 text-purple-400"></i> 树视图
    </div>
    <div 
      class="sync-indicator absolute top-2 bg-dark-light bg-opacity-90 px-2 py-1 rounded text-sm" 
      :class="{ syncing: isSyncing }"
    >
      <span class="sync-icon mr-1">⟳</span>
      <span>{{ isSyncing ? '同步中...' : '已同步' }}</span>
    </div>
    <div id="cy-tree" ref="canvasRef" class="w-full h-full"></div>
    <div class="zoom-controls">
      <button 
        title="放大树视图"
        @click="$emit('zoomIn')"
      >
        <i class="fa fa-search-plus"></i>
      </button>
      <button 
        title="缩小树视图"
        @click="$emit('zoomOut')"
      >
        <i class="fa fa-search-minus"></i>
      </button>
      <button 
        title="适应树视图"
        @click="$emit('fitView')"
      >
        <i class="fa fa-arrows-alt"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import cytoscape from 'cytoscape'
import type { PropType } from 'vue'
import type { Node, Edge } from '../../types/graph'

// Props
const props = defineProps({
  graphData: {
    type: Object,
    required: true
  },
  isSyncing: {
    type: Boolean,
    default: false
  },
  currentMode: {
    type: String,
    default: 'select'
  },
  activeNodeType: {
    type: String,
    default: ''
  },
  relationshipCreationMode: {
    type: Boolean,
    default: false
  },
  startNode: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits<{
  'node-select': [nodeData: any]
  'relationship-select': [edgeData: any]
  'node-create': [nodeData: any]
  'create-relationship': [startNode: any, endNode: any]
  zoomIn: []
  zoomOut: []
  fitView: []
}>()

// Refs
const canvasRef = ref<HTMLElement | null>(null)
let cy: any = null

// 初始化画布
onMounted(() => {
  if (canvasRef.value) {
    cy = cytoscape({
      container: canvasRef.value,
      layout: {
        name: 'grid',
        padding: 30,
        rows: undefined,
        cols: 1,
        fit: true,
        avoidOverlap: true
      },
      style: getCytoscapeStyles(),
      elements: {
        nodes: [],
        edges: []
      },
      wheelSensitivity: 0.2
    })
    
    setupEventListeners()
  }
})

// 更新树画布
function updateCanvas() {
  if (!cy) return
  
  // 确认函数执行
  console.log('TreeCanvas: updateCanvas函数被调用');
  
  // 检查数据是否存在
  console.log('TreeCanvas: 边总数:', props.graphData.edges?.length || 0);
  console.log('TreeCanvas: 节点总数:', props.graphData.nodes?.length || 0);
  
  if (props.graphData.edges && props.graphData.nodes) {
    // 节点去重 - 基于ID
    const uniqueNodes = [...new Map(props.graphData.nodes.map(node => [node.id, node])).values()];

    // 边去重 - 基于边ID，确保新创建的边能正确显示
    const uniqueEdges = [...new Map(props.graphData.edges.map(edge => [edge.id, edge])).values()];

    console.log('TreeCanvas: 去重后的节点数:', uniqueNodes.length);
    console.log('TreeCanvas: 去重后的边数:', uniqueEdges.length);

    // 使用去重后的数据
    const elements = {
      nodes: uniqueNodes.map(node => ({ data: node })),
      edges: uniqueEdges.map(edge => ({ data: edge }))
    };
       
    console.log('准备更新画布的数据:', elements);
    // 清空并更新画布
    cy.remove('*')
    cy.add(elements)
  }
  
  // 重新布局
  cy.layout({
    name: 'grid',
    padding: 30,
    rows: undefined,
    cols: 1,
    fit: true,
    avoidOverlap: true
  }).run()
}

// 监听数据变化
watch(
  () => props.graphData,
  () => {
    updateCanvas()
  },
  { deep: true }
)

// 获取Cytoscape样式
function getCytoscapeStyles() {
  return [
    // 节点样式
    {
      selector: 'node',
      style: {
        'background-color': '#2196F3',
        'color': '#fff',
        'label': function(ele) { return ele.data('properties')?.name || ele.data('label'); },
        'width': 60,
        'height': 60,
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': 14,
        'border-width': 2,
        'border-color': '#fff',
        'transition-property': 'background-color, border-color',
        'transition-duration': '0.3s'
      }
    },
    // 选中的节点样式
    {
      selector: 'node:selected',
      style: {
        'background-color': '#FFC107',
        'border-color': '#FF5722',
        'border-width': 3
      }
    },
    // 边样式
    {
      selector: 'edge',
      style: {
        'width': 3,
        'line-color': '#888',
        'target-arrow-color': '#888',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': function(ele) { return ele.data('type') || ele.data('label'); },
        'color': '#fff',
        'font-size': 12,
        'text-background-color': '#333',
        'text-background-opacity': 0.8,
        'text-background-padding': 3
      }
    },
    // 选中的边样式
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#FFC107',
        'target-arrow-color': '#FFC107',
        'width': 4
      }
    },
    // 高亮相连节点
    {
      selector: 'node.highlight',
      style: {
        'background-color': '#4CAF50',
        'border-color': '#8BC34A'
      }
    },
    // 高亮相连边
    {
      selector: 'edge.highlight',
      style: {
        'line-color': '#4CAF50',
        'target-arrow-color': '#4CAF50'
      }
    }
  ]
}

// 设置事件监听器
function setupEventListeners() {
  if (!cy) return
  
  cy.on('select', 'node', (event: any) => {
    const node = event.target
    const nodeData = node.data()
    console.log('TreeCanvas节点选中，准备发出node-select事件:', nodeData)
    
    // 如果处于边创建模式
    if (props.relationshipCreationMode) {
      if (props.startNode && props.startNode.id !== nodeData.id) {
        // 选中了不同的目标节点，创建边
        emit('create-relationship', props.startNode, nodeData)
      } else if (props.startNode && props.startNode.id === nodeData.id) {
        // 选中了相同的节点
        emit('node-select', nodeData)
      } else {
        // 第一个节点被选中
        emit('node-select', nodeData)
      }
    } else {
      // 正常选择模式
      emit('node-select', nodeData)
    }
  })

  cy.on('select', 'edge', (event: any) => {
    const edge = event.target
    emit('relationship-select', edge.data())
  })

  // 添加点击空白处取消选择
  cy.on('tap', (event: any) => {
    if (event.target === cy) {
      cy.elements().unselect()
      // 如果在边创建模式下点击空白处，通知父组件
      if (props.relationshipCreationMode) {
        emit('node-select', null)
      }
    }
  })
}

// 暴露方法给父组件
defineExpose({
  getCy: () => cy,
  resize: () => {
    if (cy) cy.resize()
  }
})
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 5px;
  overflow: hidden;
}

.zoom-controls button {
  padding: 8px 12px;
  background: transparent;
  color: white;
  border: none;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.zoom-controls button:last-child {
  border-bottom: none;
}

.zoom-controls button:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>