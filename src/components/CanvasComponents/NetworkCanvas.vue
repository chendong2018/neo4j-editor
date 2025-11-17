<template>
  <div class="canvas-container">
    <div class="absolute top-2 left-2 bg-dark-light bg-opacity-90 px-2 py-1 rounded text-sm">
      <i class="fa fa-share-alt mr-1 text-blue-400"></i> 网络图视图
    </div>
    <div 
      class="sync-indicator absolute top-2 bg-dark-light bg-opacity-90 px-2 py-1 rounded text-sm" 
      :class="{ syncing: isSyncing }"
    >
      <span class="sync-icon mr-1">⟳</span>
      <span>{{ isSyncing ? '同步中...' : '已同步' }}</span>
    </div>
    <div id="cy-network" ref="canvasRef" class="w-full h-full"></div>
    <div class="zoom-controls">
      <button 
        title="放大网络视图"
        @click="$emit('zoomIn')"
      >
        <i class="fa fa-search-plus"></i>
      </button>
      <button 
        title="缩小网络视图"
        @click="$emit('zoomOut')"
      >
        <i class="fa fa-search-minus"></i>
      </button>
      <button 
        title="适应网络视图"
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
  activeRelationshipType: {
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
    try {
      cy = cytoscape({
        container: canvasRef.value,
        layout: {
          name: 'breadthfirst',
          directed: true,
          padding: 30,
          fit: true,
          avoidOverlap: true,
          spacingFactor: 1.5
        },
        style: getCytoscapeStyles(),
        elements: {
          nodes: [],
          edges: []
        },
        wheelSensitivity: 0.2
      })
      
      setupEventListeners()
    } catch (error) {
      console.error('初始化网络视图失败:', error)
    }
  }
})

// 更新画布
function updateCanvas() {
  if (!cy || !canvasRef.value) return
  
  try {
    // 准备元素数据
    console.log('准备更新画布的原始数据:', {
      nodes: props.graphData.nodes,
      edges: props.graphData.edges
    });
    
    // 节点和边去重 - 基于ID，避免重复显示
    const uniqueNodes = [...new Map(props.graphData.nodes.map(node => [node.id, node])).values()];
    const uniqueEdges = [...new Map(props.graphData.edges.map(edge => [edge.id, edge])).values()];
    
    console.log('NetworkCanvas: 去重后的节点数:', uniqueNodes.length);
    console.log('NetworkCanvas: 去重后的边数:', uniqueEdges.length);
    
    const elements = {
      nodes: uniqueNodes.map(node => ({ group: 'nodes', data: node })),
      edges: uniqueEdges.map(edge => ({ group: 'edges', data: edge }))
    };
    
    console.log('转换后的Cytoscape元素:', elements);
    
    // 验证节点ID与边的连接关系
  const nodeIds = props.graphData.nodes.map(n => n.id);
  const invalidEdges = props.graphData.edges.filter(edge => 
    !nodeIds.includes(edge.source) || !nodeIds.includes(edge.target)
  );
  
  if (invalidEdges.length > 0) {
    console.error('发现无效的边（source或target节点不存在）:', invalidEdges);
  } else {
    console.log('所有边都有有效的source和target节点');
  }
  
  // 清空并更新画布
  cy.remove('*')
  const addedElements = cy.add(elements);
  console.log('成功添加到画布的元素:', {
    nodes: addedElements.filter('node').length,
    edges: addedElements.filter('edge').length
  });
  
  // 重新布局
  cy.layout({
    name: 'breadthfirst',
    directed: true,
    padding: 30,
    fit: true,
    avoidOverlap: true,
    spacingFactor: 1.5
  }).run()
    
    console.log('网络视图成功更新:', { nodes: props.graphData.nodes.length, edges: props.graphData.edges.length })
  } catch (error) {
    console.error('更新网络视图时出错:', error)
    // 尝试重新初始化网络视图作为备选方案
    try {
      cy = cytoscape({
        container: canvasRef.value,
        layout: {
          name: 'breadthfirst',
          directed: true,
          padding: 30,
          fit: true,
          avoidOverlap: true,
          spacingFactor: 1.5
        },
        style: getCytoscapeStyles(),
        elements: {
          nodes: props.graphData.nodes.map(node => ({ group: 'nodes', data: node })),
          edges: props.graphData.edges.map(edge => ({ group: 'edges', data: edge }))
        },
        wheelSensitivity: 0.2
      })
      setupEventListeners()
      console.log('网络视图重新初始化成功')
    } catch (reinitError) {
      console.error('重新初始化网络视图失败:', reinitError)
    }
  }
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
  },
  showRelatedGraph: (selectedNodeData: any, allNodes: Node[], allEdges: Edge[]) => {
    if (!cy) return
    
    // 获取与选中节点直接相关的所有边
    const relatedEdges = allEdges.filter(edge => 
      edge.source === selectedNodeData.id || edge.target === selectedNodeData.id
    )
    
    // 获取所有相关节点ID（包括选中节点和与其相连的节点）
    const relatedNodeIds = new Set([selectedNodeData.id])
    relatedEdges.forEach(edge => {
      relatedNodeIds.add(edge.source)
      relatedNodeIds.add(edge.target)
    })
    
    // 过滤出相关的节点
    const relatedNodes = allNodes.filter(node => relatedNodeIds.has(node.id))
    
    // 更新网络图视图
    cy.elements().remove()
    
    cy.add({
      nodes: relatedNodes.map(node => ({
        group: 'nodes',
        data: node
      })),
      edges: relatedEdges.map(edge => ({
        group: 'edges',
        data: edge
      }))
    })
    
    // 重新布局
    cy.layout({
      name: 'breadthfirst',
      directed: true,
      padding: 30,
      fit: true,
      avoidOverlap: true,
      spacingFactor: 1.5
    }).run()
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