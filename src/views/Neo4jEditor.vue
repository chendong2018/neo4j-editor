<template>
  <div class="neo4j-editor">
    <!-- Header -->
    <header class="bg-primary text-white p-4 shadow-md">
      <div class="container mx-auto flex justify-between items-center">
        <div class="flex items-center">
          <i class="fa fa-database text-2xl mr-2"></i>
          <h1 class="text-xl font-bold">Neo4j Visual Editor</h1>
        </div>
        <div class="flex items-center space-x-4">
          <div class="relative">
            <input 
              type="text" 
              id="search-input" 
              placeholder="Search nodes..." 
              class="bg-secondary bg-opacity-50 rounded-full py-1 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
            <i class="fa fa-search absolute right-3 top-1/2 transform -translate-y-1/2 text-sm"></i>
          </div>
          <button 
            id="connect-btn" 
            class="bg-accent hover:bg-blue-600 text-white py-1 px-4 rounded-full text-sm flex items-center"
            @click="showConnectModal = true"
          >
            <i class="fa fa-plug mr-1"></i> {{ isConnected ? '重新连接' : '连接' }}
          </button>
        </div>
      </div>
    </header>
    
    <!-- Main Content -->
    <main class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar -->
      <LeftSidebar 
        ref="leftSidebar"
        :nodeTypes="nodeTypes"
        :relationshipTypes="relationshipTypes"
        :labels="labels"
        :activeLabels="activeLabels"
        :activeNodeType="activeNodeType"
        :activeRelationshipType="activeRelationshipType"
        @addNodeType="showAddNodeTypeModal = true"
        @addRelationshipType="showAddRelationshipTypeModal = true"
        @selectNodeType="selectNodeType"
        @selectRelationshipType="selectRelationshipType"
        @deleteSelected="deleteSelected"
        @clearAll="clearAll"
        @exportGraph="exportGraph"
        @exportNeo4j="exportNeo4j"
      />

      <!-- Center Canvas - Split View -->
      <section class="flex-1 flex flex-col bg-dark">
        <!-- View Switcher and Mode Controls -->
        <Toolbar 
          :currentViewMode="currentViewMode"
          :currentMode="currentMode"
          :nodeCount="nodeCount"
          :edgeCount="edgeCount"
          :isSyncing="isSyncing"
          :selectedNode="selectedNode"
          :relationshipCreationMode="relationshipCreationMode"
          @switchViewMode="switchViewMode"
          @switchMode="switchMode"
          @clearSelection="clearSelection"
        />
        
        <!-- Split Canvas Container -->
        <div class="flex-1 flex overflow-hidden"> 
          <!-- Tree View (Left) -->
          <div 
            class="relative border-r border-gray-800 transition-all duration-300 flex-1"
            v-show="currentViewMode === 'dual' || currentViewMode === 'tree'"
            id="tree-container"
            :style="{ display: currentViewMode === 'dual' || currentViewMode === 'tree' ? 'block' : 'none', flex: '1 1 0%' }"
          >
            <TreeCanvas 
              ref="treeCanvasRef"
              :graphData="graphData"
              :currentMode="currentMode"
              :activeNodeType="activeNodeType"
              :isSyncing="isSyncing"
              :relationshipCreationMode="relationshipCreationMode.isActive"
              :startNode="relationshipCreationMode.startNodeId ? { id: relationshipCreationMode.startNodeId, label: relationshipCreationMode.startNodeLabel, properties: relationshipCreationMode.startNodeProperties } : null"
              @node-select="handleNodeSelect"
              @relationship-select="handleRelationshipSelect"
              @node-create="createNode"
              @create-relationship="(start, end) => createRelationship(start.id, end.id)"
            />
          </div>
          
          <!-- Network View (Right) -->
          <div 
            class="relative transition-all duration-300 flex-1"
            v-show="currentViewMode === 'dual' || currentViewMode === 'network'"
            id="network-container"
            :style="{ display: currentViewMode === 'dual' || currentViewMode === 'network' ? 'block' : 'none', flex: '1 1 0%' }"
          >
            <NetworkCanvas 
              ref="networkCanvasRef"
              :graphData="networkGraphData"
              :currentMode="currentMode"
              :activeRelationshipType="activeRelationshipType"
              :isSyncing="isSyncing"
              :relationshipCreationMode="relationshipCreationMode.isActive"
              :startNode="relationshipCreationMode.startNodeId ? { id: relationshipCreationMode.startNodeId, label: relationshipCreationMode.startNodeLabel, properties: relationshipCreationMode.startNodeProperties } : null"
              @node-select="handleNetworkNodeSelect"
              @relationship-select="handleRelationshipSelect"
              @node-create="createNode"
              @create-relationship="(start, end) => createRelationship(start.id, end.id)"
            />
          </div>
        </div>
        
        <!-- Cypher Preview Panel -->
        <CypherPreviewPanel 
          :cypherQuery="cypherQuery"
          @run-query="runCypher"
          @clear-query="clearCypher"
        />
      </section>

      <!-- Right Sidebar -->
      <RightSidebar 
        :selectedNode="selectedNode"
        :selectedRelationship="selectedRelationship"
        :batchProperty="batchProperty"
        :currentMode="currentMode"
        @add-node-property="showAddProperty('node')"
        @add-relationship-property="showAddProperty('relationship')"
        @deleteNodeProperty="deleteNodeProperty"
        @deleteRelationshipProperty="deleteRelationshipProperty"
        @applyNodeProperties="applyNodeProperties"
        @applyRelationshipProperties="applyRelationshipProperties"
        @applyBatchProperties="applyBatchProperties"
        @create-node="handleCreateNode"
        :relationshipCreationMode="relationshipCreationMode"
      />
    </main>

    <!-- Connect Modal -->
    <ConnectModal 
      v-model="showConnectModal"
      :connectionParams="connectionParams"
      @connect="connectToNeo4j"
    />

    <!-- Add Node Type Modal -->
    <AddNodeTypeModal 
      v-model="showAddNodeTypeModal"
      @add="addNodeType"
    />

    <!-- Add Relationship Type Modal -->
    <AddRelationshipTypeModal 
      v-model="showAddRelationshipTypeModal"
      :new-relationship-type="newRelationshipType"
      @add="addRelationshipType"
    />

    <!-- Add Property Modal -->
    <AddPropertyModal 
      v-model="showAddPropertyModal"
      :propertyType="propertyType"
      :new-property="newProperty"
      @add="addProperty"
    />
  </div>
   <!-- 日志面板 -->
    <div 
      class="log-panel bg-dark-alt border-t border-gray-800 transition-all duration-300" 
      :class="{ 'h-0': !showLogs, 'h-80': showLogs }"
    >
      <LogViewer 
        :logs="logs"
        @clear="clearLogs"
      />
    </div>
    
    <!-- 日志切换按钮 -->
    <button 
      class="fixed bottom-4 right-4 bg-primary hover:bg-primary-dark text-white p-2 rounded-full shadow-lg z-40"
      @click="toggleLogs"
      :class="{ 'bottom-84': showLogs }"
    >
      <i class="fa fa-history"></i>
    </button> 
</template>

<script setup lang="ts">
import { ref, reactive, onBeforeUnmount, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { graphApi } from '../api/graphApi'
import type { Neo4jConnectionParams } from '../api/neo4jApi'
import { useGraphStore } from '../store/graphStore'
import LogViewer from '../components/Logs/LogViewer.vue'
import { logService } from '../utils/logService'

// 导入子组件
import LeftSidebar from '../components/Sidebars/LeftSidebar.vue'
import RightSidebar from '../components/Sidebars/RightSidebar.vue'
import TreeCanvas from '../components/CanvasComponents/TreeCanvas.vue'
import NetworkCanvas from '../components/CanvasComponents/NetworkCanvas.vue'
import Toolbar from '../components/Toolbar.vue'
import CypherPreviewPanel from '../components/CypherPreviewPanel.vue'
import ConnectModal from '../components/Modals/ConnectModal.vue'
import AddNodeTypeModal from '../components/Modals/AddNodeTypeModal.vue'
import AddRelationshipTypeModal from '../components/Modals/AddRelationshipTypeModal.vue'
import AddPropertyModal from '../components/Modals/AddPropertyModal.vue'

// 创建graphStore实例
const graphStore = useGraphStore()

// 引用元素
const treeCanvasRef: Ref<HTMLElement | null> = ref(null)
const networkCanvasRef: Ref<HTMLElement | null> = ref(null)

// 状态管理
const currentViewMode = ref('dual')
const currentMode = ref('select')
const isSyncing = ref(false)
const nodeCount = ref(0)
const edgeCount = ref(0)

// 模态框状态
const showConnectModal = ref(false)
const showAddNodeTypeModal = ref(false)
const showAddRelationshipTypeModal = ref(false)
const showAddPropertyModal = ref(false)
const showLogs = ref(true)
const logs = ref(logService.getLogs())

// 属性类型
const propertyType = ref('node')

// 连接参数
const connectionParams = reactive({
  uri: 'bolt://192.168.1.210:7687',
  username: 'neo4j',
  password: '1234qwer' // Neo4j默认安装后的常见默认密码
})

// 节点类型数据（初始为空，连接后从Neo4j加载）
const nodeTypes = ref([])

// 关系类型数据（初始为空，连接后从Neo4j加载）
const relationshipTypes = ref([])

// 活动节点和关系类型
const activeNodeType = ref('Person')
const activeRelationshipType = ref('')

// 标签和活动标签（初始为空，连接后从Neo4j加载）
const labels = ref([])
const activeLabels = ref<string[]>([])

// 选中的节点和关系
const selectedNode = reactive({
  id: '',
  label: '',
  properties: {}
})

const selectedRelationship = ref<{
  id: string
  type: string
  startNodeId: string
  endNodeId: string
  properties: Record<string, any>
} | null>(null)

// 边创建模式相关状态
const relationshipCreationMode = reactive({
  isActive: false,
  startNodeId: '',
  startNodeLabel: '',
  startNodeProperties: {} as Record<string, any>,
 提示信息: ''
})

// 批量操作属性
const batchProperty = reactive({
  key: '',
  value: ''
})

// Cypher查询
const cypherQuery = ref('')

// 新节点类型表单
const newNodeType = reactive({
  name: '',
  icon: 'fa-circle',
  color: '#2196F3',
  properties: [] as { name: string; type: string }[]
})

// 新关系类型表单
const newRelationshipType = reactive({
  name: '',
  icon: 'fa-arrow-right',
  color: '#FF9800',
  properties: [] as { name: string; type: string }[]
})

// 新属性表单
const newProperty = reactive({
  key: '',
  value: '',
  type: 'string'
})

// 原始完整图数据（用于在过滤后恢复）
const originalGraphData = reactive({
  nodes: [] as any[],
  edges: [] as any[]
})

// 当前显示的图数据
const graphData = reactive({
  nodes: [] as any[],
  edges: [] as any[]
})

const networkGraphData = reactive({
  nodes: [] as any[],
  edges: [] as any[]
})

// 是否已连接到Neo4j
const isConnected = ref(false)

// 处理网络节点选择事件
function handleNetworkNodeSelect(nodeData: any) {
  console.log('网络图节点选择事件触发，接收到的数据:', nodeData)
  
  // 如果处于边创建模式
  if (relationshipCreationMode.isActive) {
    if (!relationshipCreationMode.startNodeId) {
      // 第一个节点被选中，设置为起始节点
      relationshipCreationMode.startNodeId = nodeData.id
      relationshipCreationMode.startNodeLabel = nodeData.label
      relationshipCreationMode.startNodeProperties = { ...nodeData.properties || {} }
      relationshipCreationMode.提示信息 = '请选择目标节点'
      
      selectedNode.id = nodeData.id || ''
      selectedNode.label = nodeData.label || ''
      selectedNode.properties = { ...nodeData.properties || {} }
      
      selectedRelationship.value = null
      logService.info('已选择起始节点，请选择目标节点', { nodeId: nodeData.id })
      console.log('设置起始节点:', relationshipCreationMode.startNodeId)
    } else if (nodeData && relationshipCreationMode.startNodeId !== nodeData.id) {
      // 选中了不同的目标节点，创建边
      createRelationship(relationshipCreationMode.startNodeId, nodeData.id)
    } else if (nodeData && relationshipCreationMode.startNodeId === nodeData.id) {
      // 选中了相同的节点，给出提示
      logService.warning('不能选择相同的节点作为目标', { nodeId: nodeData.id })
      alert('请选择不同的目标节点')
    }
  } else {
    // 正常选择模式
    selectedNode.id = nodeData.id || ''
    selectedNode.label = nodeData.label || ''
    selectedNode.properties = { ...nodeData.properties || {} }
    
    console.log('网络图选中节点后，selectedNode状态:', selectedNode)
    console.log('selectedNode.id存在吗:', !!selectedNode.id)
    
    selectedRelationship.value = null
  }
}

// 处理树节点选择事件
  function handleNodeSelect(nodeData: any) {
    console.log('树视图节点选择事件触发，接收到的数据:', nodeData)
    
    // 如果处于边创建模式
    if (relationshipCreationMode.isActive) {
      if (!relationshipCreationMode.startNodeId) {
        // 第一个节点被选中，设置为起始节点
        relationshipCreationMode.startNodeId = nodeData.id
        relationshipCreationMode.startNodeLabel = nodeData.label
        relationshipCreationMode.startNodeProperties = { ...nodeData.properties || {} }
        relationshipCreationMode.提示信息 = '请选择目标节点'
        
        selectedNode.id = nodeData.id || ''
        selectedNode.label = nodeData.label || ''
        selectedNode.properties = { ...nodeData.properties || {} }
        
        selectedRelationship.value = null
        console.log('设置起始节点:', relationshipCreationMode.startNodeId)
      } else if (nodeData && relationshipCreationMode.startNodeId !== nodeData.id) {
        // 选中了不同的目标节点，创建边
        createRelationship(relationshipCreationMode.startNodeId, nodeData.id)
      } else if (nodeData && relationshipCreationMode.startNodeId === nodeData.id) {
        // 选中了相同的节点，给出提示
        alert('请选择不同的目标节点')
      }
    } else {
      // 正常选择模式
      // 确保节点ID正确设置
      selectedNode.id = nodeData.id || ''
      selectedNode.label = nodeData.label || ''
      selectedNode.properties = { ...nodeData.properties || {} }
      
      console.log('树视图选中节点后，selectedNode状态:', selectedNode)
      console.log('selectedNode.id存在吗:', !!selectedNode.id)
      
      selectedRelationship.value = null
      
      // 获取选中节点的ID
      const selectedNodeId = nodeData.id;
      
    // 查询与选中节点相关的所有关系
    const relatedEdges = graphData.edges.filter(edge => 
      edge.source === selectedNodeId || edge.target === selectedNodeId
    );
    
    // 确保每个边都有唯一的id
    const edgesWithId = relatedEdges.map(edge => {
      if (!edge.id) {
        // 如果没有id，生成一个基于source和target的唯一id
        return { ...edge, id: `edge_${edge.source}_${edge.target}_${edge.label || 'rel'}` };
      }
      return edge;
    });
    
    // 提取所有相关节点的ID（包括选中节点自己）
    const relatedNodeIds = new Set([selectedNodeId]);
    edgesWithId.forEach(edge => {
      relatedNodeIds.add(edge.source);
      relatedNodeIds.add(edge.target);
    });
    
    // 查询与选中节点相关的所有节点
    const relatedNodes = graphData.nodes.filter(node => 
      relatedNodeIds.has(node.id)
    );
    
    // 更新networkGraphData
    networkGraphData.nodes = [...relatedNodes];
    networkGraphData.edges = [...edgesWithId];
    
    // 注意：移除了clearSelection()调用，这样选中状态会保持，按钮就能正确响应选中状态
    
    console.log(`查询到的相关节点数量: ${relatedNodes.length}, 相关关系数量: ${relatedEdges.length}`);
    }
  }

// 处理关系选择事件
function handleRelationshipSelect(edgeData: any) {
  selectedRelationship.value = {
    id: edgeData.id,
    type: edgeData.label || edgeData.type || '',
    startNodeId: edgeData.source,
    endNodeId: edgeData.target,
    properties: { ...edgeData.properties || {} }
  }
  
  // 清空节点选择
  selectedNode.id = ''
  selectedNode.label = ''
  selectedNode.properties = {}
}

// 创建节点
function createNode(pos?: any, canvasType?: string) {
  const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const newNode = {
    id,
    label: activeNodeType.value,
    type: activeNodeType.value,
    properties: { name: `${activeNodeType.value} ${Date.now().toString().slice(-4)}` }
  }
  
  // 添加到图数据
  graphData.nodes.push(newNode)
  
  // 更新计数
  updateCounts()
  logService.success(`创建新节点: ${activeNodeType.value}`, { nodeId: newNode.id })
  
  // 生成Cypher
  generateCypherQuery()
}

// 处理从右侧边栏创建新节点
function handleCreateNode(nodeData: { label: string; properties: Record<string, any> }) {
  const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const newNode = {
    id,
    label: nodeData.label,
    type: nodeData.label,
    properties: nodeData.properties
  }
  
  // 添加到图数据
  graphData.nodes.push(newNode)
  
  // 更新计数
  updateCounts()
  
  // 生成Cypher
  generateCypherQuery()
  
  console.log('新节点已创建:', newNode)
}

// 初始化组件
onMounted(() => {
  // 初始化日志服务
  const removeListener = logService.addListener((newLogs) => {
    logs.value = newLogs
  })
  
  // 清理函数
  onBeforeUnmount(() => {
    removeListener()
  })
  
  // 记录初始化日志
  logService.info('编辑器初始化完成')
})

// 切换视图模式
function switchViewMode(mode: string) {
  // 确保mode是有效的视图模式值
  const validModes = ['dual', 'tree', 'network']
  if (validModes.includes(mode)) {
    currentViewMode.value = mode
    console.log(`切换到视图模式: ${mode}`, currentViewMode.value)
    logService.info(`切换视图模式: ${mode}`, currentViewMode.value)
    
    // 强制重新计算布局，确保容器正确显示
    setTimeout(() => {
      const treeContainer = document.getElementById('tree-container')
      const networkContainer = document.getElementById('network-container')
      
      console.log('容器状态:', {
        treeVisible: treeContainer?.style.display !== 'none',
        networkVisible: networkContainer?.style.display !== 'none',
        treeClass: treeContainer?.className,
        networkClass: networkContainer?.className,
        treeComputedStyle: treeContainer ? window.getComputedStyle(treeContainer).display : 'not found',
        networkComputedStyle: networkContainer ? window.getComputedStyle(networkContainer).display : 'not found'
      })
      
      // 触发重排以确保布局正确应用
      if (treeContainer) {
        treeContainer.style.height = '0px'
        treeContainer.offsetHeight // 触发重排
        treeContainer.style.height = '100%'
      }
      
      if (networkContainer) {
        networkContainer.style.height = '0px'
        networkContainer.offsetHeight // 触发重排
        networkContainer.style.height = '100%'
      }
    }, 50)
  } else {
    console.error(`无效的视图模式: ${mode}`)
    logService.error(`无效的视图模式: ${mode}`)
  }
}

// 切换日志面板显示
function toggleLogs() {
  showLogs.value = !showLogs.value
  logService.info(`${showLogs.value ? '显示' : '隐藏'}日志面板`)  
}

// 清空日志
function clearLogs() {
  logService.clearLogs()
  logService.info('日志已清空')
}

// 切换操作模式
function switchMode(mode: string) {
  // 如果当前是relationship模式并且要切换到其他模式，清除边创建状态
  if (currentMode.value === 'relationship' && mode !== 'relationship') {
    relationshipCreationMode.isActive = false
    relationshipCreationMode.startNodeId = ''
    relationshipCreationMode.startNodeLabel = ''
    relationshipCreationMode.startNodeProperties = {}
    relationshipCreationMode.提示信息 = ''
  }
  
  // 如果切换到relationship模式，初始化边创建状态
  if (mode === 'relationship') {
    if (selectedNode.id) {
      relationshipCreationMode.isActive = true
      relationshipCreationMode.startNodeId = selectedNode.id
      relationshipCreationMode.startNodeLabel = selectedNode.label
      relationshipCreationMode.startNodeProperties = { ...selectedNode.properties }
      relationshipCreationMode.提示信息 = '请选择目标节点'
    } else {
      // 如果没有选中节点，给出提示
      alert('请先选择起始节点')
      return // 不切换模式
    }
  }
  
  currentMode.value = mode
}

// 创建边关系
function createRelationship(sourceId: string, targetId: string) {
  try {
    // 验证节点ID
    if (!sourceId || !targetId) {
      throw new Error('节点ID不能为空')
    }
    
    if (sourceId === targetId) {
      alert('请选择不同的目标节点')
      return
    }
    
    const relationshipType = activeRelationshipType.value || 'RELATED_TO'
    const edgeId = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newEdge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      label: relationshipType,
      type: relationshipType,
      properties: {}
    }
    
    // 添加到图数据
    graphData.edges.push(newEdge)
    networkGraphData.edges.push(newEdge)
    
    // 更新计数
    updateCounts()
    logService.success(`成功创建关系: ${relationshipType}`, { edgeId: newEdge.id })
    
    // 生成Cypher
    generateCypherQuery()
    
    // 退出边创建模式
    relationshipCreationMode.isActive = false
    relationshipCreationMode.startNodeId = ''
    relationshipCreationMode.startNodeLabel = ''
    relationshipCreationMode.startNodeProperties = {}
    relationshipCreationMode.提示信息 = ''
    
    // 重置操作模式为select，确保按钮状态正确更新
    currentMode.value = 'select'
    
    // 清除节点选择，确保按钮正确禁用
    selectedNode.id = ''
    selectedNode.label = ''
    selectedNode.properties = {}
    
    // 清除关系选择
    selectedRelationship.value = null
    
    console.log('成功创建边，已清除节点选择，按钮将被正确禁用')
    
    console.log('成功创建边:', newEdge)
  } catch (error) {
    console.error('创建边时出错:', error)
    logService.error(`创建关系失败: ${error instanceof Error ? error.message : String(error)}`, { module: 'editor' })
    alert(`创建关系失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 清除选择
function clearSelection() {
  selectedNode.id = ''
  selectedNode.label = ''
  selectedNode.properties = {}
  selectedRelationship.value = null
  
  // 如果处于边创建模式且有起始节点，给出提示
  if (relationshipCreationMode.isActive && relationshipCreationMode.startNodeId) {
    logService.warning('边创建已取消，请重新选择起始节点', { module: 'editor' })
  }
  
  // 同时清除边创建模式状态
  relationshipCreationMode.isActive = false
  relationshipCreationMode.startNodeId = ''
  relationshipCreationMode.startNodeLabel = ''
  relationshipCreationMode.startNodeProperties = {}
  relationshipCreationMode.提示信息 = ''
  
  console.log('清除选择后，selectedNode状态:', selectedNode)
}

// 更新计数
function updateCounts() {
  nodeCount.value = graphData.nodes.length
  edgeCount.value = graphData.edges.length
}

// 应用节点属性
function applyNodeProperties(nodeId: string, properties: Record<string, any>, newLabel?: string, removeLabels?: string[]) {
  if (!nodeId) return
  
  // 更新图数据
  const nodeIndex = graphData.nodes.findIndex(n => n.id === nodeId)
  if (nodeIndex !== -1) {
    const updatedNode = {
      ...graphData.nodes[nodeIndex],
      label: graphData.nodes[nodeIndex].label,
      properties: properties
    }
    
    graphData.nodes[nodeIndex] = updatedNode
    
    // 检查是否需要修改标签
    let labelsToAdd: string[] = []
    let labelsToRemove: string[] = []
    if (newLabel && newLabel !== updatedNode.label) {
      // 需要移除旧标签，添加新标签
      const oldLabel = updatedNode.labels?.[0] || updatedNode.label // 获取当前第一个标签
      if (oldLabel && oldLabel !== newLabel) {
        // 始终添加NewLabel和Person标签
        labelsToAdd = [newLabel]
        // 始终移除OldLabel标签
        labelsToRemove = [oldLabel]
      }
    }
  
    // 调用API更新节点属性和标签，包含要删除的属性
    graphApi.updateNodeWithLabels(nodeId, properties, labelsToAdd.length > 0 ? labelsToAdd : undefined, 
                                labelsToRemove.length > 0 ? labelsToRemove : undefined,
                                propertiesToDelete.value.length > 0 ? propertiesToDelete.value : undefined)
        .then(() => {
          // 清空已删除的属性列表
          propertiesToDelete.value = []
        console.log('节点属性和标签更新成功')
      })
      .catch(error => {
        console.error('节点属性和标签更新失败:', error)
      })
  }
  
  // 生成Cypher
  generateCypherQuery()
}

// 应用关系属性
async function applyRelationshipProperties() {
  if (!selectedRelationship.value) return
  console.log('更新或新增关系属性:', selectedRelationship.value)
  try {
    // 获取原关系的类型（从图数据中）
    const originalEdge = graphData.edges.find(e => e.id === selectedRelationship.value!.id);
    const originalType = originalEdge?.type || originalEdge?.label || '';
    const newType = selectedRelationship.value.type;
    console.log('关系ID:', selectedRelationship.value.id) 

    if (parseInt(selectedRelationship.value.id)) { 
      // 关系ID存在，更新关系属性
      await graphApi.updateRelationship(
        selectedRelationship.value.id,
        selectedRelationship.value.properties,
        relationshipPropertiesToDelete.value,
        newType !== originalType ? newType : undefined
      )
    } else {
      // 关系ID不存在，创建新关系
      await graphApi.createRelationship(
        selectedRelationship.value.startNodeId,
        selectedRelationship.value.endNodeId,
        selectedRelationship.value.type,
        selectedRelationship.value.properties
      )
    }
    
    // 更新图数据
    const edgeIndex = graphData.edges.findIndex(e => e.id === selectedRelationship.value!.id)
    if (edgeIndex !== -1) {
      graphData.edges[edgeIndex] = {
        ...graphData.edges[edgeIndex],
        label: selectedRelationship.value!.type,
        properties: selectedRelationship.value!.properties
      }
    }
    
    // 清空待删除属性列表
    relationshipPropertiesToDelete.value = []
    
    // 生成Cypher
    generateCypherQuery()
    
    console.log('关系属性更新成功')
  } catch (error) {
    console.error('更新关系属性失败:', error)
    alert('更新关系属性失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}

// 添加节点属性
function addNodeProperty() {
  if (!newProperty.key || !selectedNode.id) return
  
  const value = convertPropertyValue(newProperty.value, newProperty.type)
  selectedNode.properties[newProperty.key] = value
  
  // 重置表单
  resetNewProperty()
  showAddPropertyModal.value = false
}

// 添加关系属性
function addRelationshipProperty() {
  if (!newProperty.key || !selectedRelationship.value) return
  
  const value = convertPropertyValue(newProperty.value, newProperty.type)
  selectedRelationship.value.properties[newProperty.key] = value
  
  // 重置表单
  resetNewProperty()
  showAddPropertyModal.value = false
}

// 监听graphData变化，当画布数据更新时自动清除选中状态

// 监听graphData的nodes和edges变化
watch(
  () => [graphData.nodes.length, graphData.edges.length],
  (newVal, oldVal) => {
    // 只有当数据确实发生变化时才清除选中状态
    if (oldVal && (newVal[0] !== oldVal[0] || newVal[1] !== oldVal[1])) {
      // 注意：不要在handleNodeSelect中触发的更新时清除选中状态
      // 因为handleNodeSelect已经设置了新的selectedNode
      if (currentMode.value !== 'select') {
        // 仅在非select模式下清除，避免干扰正常的节点选择
        return
      }
      // 延迟执行clearSelection，避免影响正常的数据加载流程
      setTimeout(() => {
        // 再次检查是否需要清除（防止在延迟期间又有新的选择）
        if (currentMode.value === 'select') {
          // 检查当前选中的节点是否仍在graphData中存在
          const selectedNodeExists = selectedNode.id && 
            graphData.nodes.some(node => node.id === selectedNode.id)
          
          // 只有当选中的节点不再存在于当前图数据中时才清除选中状态
          if (!selectedNodeExists) {
            clearSelection()
          }
        }
      }, 100)
    }
  }
)

// 通用添加属性函数
function addProperty() {
  if (propertyType.value === 'node') {
    addNodeProperty()
  } else {
    addRelationshipProperty()
  }
}

// 存储要删除的节点属性列表
const propertiesToDelete = ref<string[]>([])
// 存储要删除的关系属性列表
const relationshipPropertiesToDelete = ref<string[]>([])

// 删除节点属性
function deleteNodeProperty(key: string) {
  delete selectedNode.properties[key]
  // 将属性添加到要删除的列表中，避免重复
  if (!propertiesToDelete.value.includes(key)) {
    propertiesToDelete.value.push(key)
  }
  console.log('要删除的节点属性列表:', propertiesToDelete.value)
}

// 删除关系属性
function deleteRelationshipProperty(key: string) {
  if (selectedRelationship.value) {
    delete selectedRelationship.value.properties[key]
    // 将属性添加到要删除的列表中，避免重复
    if (!relationshipPropertiesToDelete.value.includes(key)) {
      relationshipPropertiesToDelete.value.push(key)
    }
    console.log('要删除的关系属性列表:', relationshipPropertiesToDelete.value)
  }
}

// 应用批量属性
function applyBatchProperties() {
  if (!batchProperty.key || !batchProperty.value) return
  
  // 这里需要获取选中的多个节点或关系
  // 简化版本：只应用到当前选中的节点或关系
  if (selectedNode.id) {
    selectedNode.properties[batchProperty.key] = batchProperty.value
  } else if (selectedRelationship.value) {
    selectedRelationship.value.properties[batchProperty.key] = batchProperty.value
  }
}

// 删除选中元素
function deleteSelected() {
  if (selectedNode.id) {
    // 删除节点及其相关边
    const nodeId = selectedNode.id
    
    // 从图数据中删除
    graphData.nodes = graphData.nodes.filter(n => n.id !== nodeId)
    graphData.edges = graphData.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    
    // 清空选择
    clearSelection()
  } else if (selectedRelationship.value) {
    // 删除关系
    const edgeId = selectedRelationship.value.id
    
    // 从图数据中删除
    graphData.edges = graphData.edges.filter(e => e.id !== edgeId)
    
    // 清空选择
    clearSelection()
  }
  
  // 更新计数和Cypher
  updateCounts()
  generateCypherQuery()
}

// 清空所有
function clearAll() {
  // 清空图数据
  graphData.nodes = []
  graphData.edges = []
  
  // 清空选择
  clearSelection()
  
  // 更新计数和Cypher
  updateCounts()
  generateCypherQuery()
}

// 导出图
function exportGraph() {
  const data = JSON.stringify(graphData, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `neo4j-graph-${Date.now()}.json`
  a.click()
  
  URL.revokeObjectURL(url)
}

// 导出Neo4j格式
function exportNeo4j() {
  generateCypherQuery()
  
  // 复制到剪贴板
  navigator.clipboard.writeText(cypherQuery.value).then(() => {
    // 这里可以显示一个提示
    console.log('Cypher query copied to clipboard')
  })
}

// 生成Cypher查询
function generateCypherQuery() {
  let query = ''
  
  // 创建节点
  graphData.nodes.forEach(node => {
    let properties = ''
    if (node.properties) {
      const props = Object.entries(node.properties)
        .map(([key, value]) => {
          // 对于以数字开头或包含特殊字符的属性键，用反引号包围
          const safeKey = /^[a-zA-Z_]/.test(key) && !/\s/.test(key) ? key : `\`${key}\``;
          return `${safeKey}: ${formatPropertyValue(value)}`;
        })
        .join(', ')
      properties = props ? `{ ${props} }` : ''
    }
    query += `CREATE (n:${node.label} ${properties}) SET n.id = '${node.id}'
`
  })
  
  // 创建关系
  graphData.edges.forEach(edge => {
    let properties = ''
    if (edge.properties) {
      const props = Object.entries(edge.properties)
        .map(([key, value]) => {
          // 对于以数字开头或包含特殊字符的属性键，用反引号包围
          const safeKey = /^[a-zA-Z_]/.test(key) && !/\s/.test(key) ? key : `\`${key}\``;
          return `${safeKey}: ${formatPropertyValue(value)}`;
        })
        .join(', ')
      properties = props ? `{ ${props} }` : ''
    }
    query += `MATCH (a), (b) WHERE a.id = '${edge.source}' AND b.id = '${edge.target}' CREATE (a)-[r:${edge.label} ${properties}]->(b) SET r.id = '${edge.id}'
`
  })
  
  cypherQuery.value = query
}

// 运行Cypher
async function runCypher() {
  try {
    // 设置同步状态
    isSyncing.value = true
    
    console.log('Running Cypher:', cypherQuery.value)
    
    // 先连接到Neo4j
    await graphApi.connectToNeo4j(connectionParams as Neo4jConnectionParams)
    
    // 使用API执行Cypher查询
    const result = await graphApi.executeNeo4jCypher(cypherQuery.value)
    
    console.log('Cypher query executed successfully:', result.length, 'records returned')
    
    // 处理查询结果
    alert(`Cypher query executed successfully! ${result.length} records returned.`)
    
  } catch (error: any) {
    console.error('Failed to execute Cypher query:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
    let errorMessage = 'Failed to execute Cypher query:'
    
    if (error.code === 'Neo.ClientError.Security.Unauthorized') {
      errorMessage += ' Authentication failed. Please check username and password.'
      errorMessage += '\n\nCommon issues:'
      errorMessage += '\n- Default password might be "neo4j" (first login)'
      errorMessage += '\n- You might need to change the default password'
      errorMessage += '\n- Username might be case-sensitive'
    } else if (error.code === 'Neo.ClientError.Statement.SyntaxError') {
      errorMessage += ' Cypher syntax error. Please check your query syntax.'
    } else if (error.code === 'Neo.TransientError.Network.UnknownHost') {
      errorMessage += ' Cannot connect to the server. Please check the URI.'
    } else {
      errorMessage += ` ${error.message || 'Unknown error'}`
    }
    
    alert(errorMessage)
  } finally {
    // 使用API断开连接
    await graphApi.disconnectFromNeo4j()
    // 取消同步状态
    isSyncing.value = false
  }
}

// 清除Cypher
function clearCypher() {
  cypherQuery.value = ''
}

// 连接到Neo4j
async function connectToNeo4j() {
  try {
    console.log('Connecting to Neo4j:', connectionParams)
    
    // 设置同步状态
    isSyncing.value = true
    
    // 清空图数据，这会自动反映到子组件中
    graphData.nodes = []
    graphData.edges = []
    originalGraphData.nodes = []
    originalGraphData.edges = []
    
    logService.info('正在连接Neo4j数据库', { uri: connectionParams.uri })
    
    // 使用store中的方法连接到Neo4j并获取数据
    await graphStore.fetchGraphDataFromNeo4j(connectionParams)
    
    // 更好的方法：直接使用Neo4j的db.labels()过程获取所有节点标签
    let labelsArray: string[] = []
    try {
      // 执行Cypher查询获取所有标签
      const labelsResult = await graphApi.executeNeo4jCypher('CALL db.labels() YIELD label RETURN label;')
      console.log('db.labels()查询结果:', labelsResult)
      // 提取标签数组
      labelsArray = labelsResult.map((record: any) => record.label).filter((label: any) => label !== null && label !== undefined)
      console.log('从db.labels()获取到的标签数组:', labelsArray)
      console.log('标签总数:', labelsArray.length)

    } catch (error) {
      console.error('执行db.labels()查询失败:', error)
      // 出错时回退到原始方法
      console.log('回退到从节点数据中提取标签...')
      const labelsSet = new Set<string>()
      labelsArray = Array.from(labelsSet)
    }
    
    // 更好的方法：直接使用Neo4j的db.relationshipTypes()过程获取所有关系类型
    console.log('正在使用db.relationshipTypes()获取所有关系类型...')
    let relTypesArray: string[] = []
    try {
      // 执行Cypher查询获取所有关系类型
      const relTypesResult = await graphApi.executeNeo4jCypher('CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType;')
      console.log('db.relationshipTypes()查询结果:', relTypesResult)
      
      // 提取关系类型数组
      relTypesArray = relTypesResult.map((record: any) => record.relationshipType).filter((type: any) => type !== null && type !== undefined)
      console.log('从db.relationshipTypes()获取到的关系类型数组:', relTypesArray)
      console.log('关系类型总数:', relTypesArray.length)
      
    } catch (error) {
      console.error('执行db.relationshipTypes()查询失败:', error)
      // 出错时回退到原始方法
      console.log('回退到从边数据中提取关系类型...')
      const relationshipTypeSet = new Set<string>()
      relTypesArray = Array.from(relationshipTypeSet)
    }
    
    // 更新标签列表
    labels.value = [...labelsArray]
    activeLabels.value = [...labelsArray]
    
    // 更新节点类型
    console.log('更新nodeTypes，包含标签数量:', labelsArray.length)
    // 添加'全部'选项在顶部
    const allNodeType = {
      name: '全部',
      icon: 'fa-th-large',
      color: '#757575'
    }
    // 创建其他节点类型
    const otherNodeTypes = labelsArray.map((type, index) => ({
      name: type,
      icon: 'fa-' + (index % 5 === 0 ? 'user' : index % 5 === 1 ? 'film' : index % 5 === 2 ? 'book' : index % 5 === 3 ? 'building' : 'circle'),
      color: ['#2196F3', '#FF5722', '#4CAF50', '#9C27B0', '#F44336'][index % 5]
    }))
    // 合并类型数组，确保'全部'在顶部
    nodeTypes.value = [allNodeType, ...otherNodeTypes]
    console.log('更新后的nodeTypes:', JSON.stringify(nodeTypes.value))
    // 更新关系类型数据
    relationshipTypes.value = relTypesArray.map((type, index) => ({
      name: type,
      icon: 'fa-' + (index % 6 === 0 ? 'star' : index % 6 === 1 ? 'video-camera' : index % 6 === 2 ? 'pencil' : index % 6 === 3 ? 'briefcase' : index % 6 === 4 ? 'arrow-down' : 'exchange'),
      color: ['#FFC107', '#F44336', '#E91E63', '#00BCD4', '#607D8B', '#795548'][index % 6]
    }))
    
    // 初始时不显示图数据
    graphData.nodes = []
    graphData.edges = []
    networkGraphData.nodes = []
    networkGraphData.edges = []
    
    // 设置连接状态
    isConnected.value = true
    logService.success('成功连接到Neo4j数据库', { nodeCount: originalGraphData.nodes.length, edgeCount: originalGraphData.edges.length })
    
    // 关闭连接模态框
    showConnectModal.value = false
    
    // 清除选中状态，确保画布数据更新后按钮禁用状态正确反映
    clearSelection()
    
    // 显示成功消息
  } catch (error: any) {
    console.error('Failed to connect to Neo4j:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    logService.error('连接Neo4j数据库失败', error)
    
    let errorMessage = 'Failed to connect to Neo4j:'
    
    if (error.code === 'Neo.ClientError.Security.Unauthorized') {
      errorMessage += ' Authentication failed. Please check username and password.'
      errorMessage += '\n\nCommon issues:'
      errorMessage += '\n- Default password might be "neo4j" (first login)'
      errorMessage += '\n- You might need to change the default password'
      errorMessage += '\n- Username might be case-sensitive'
    } else if (error.code === 'Neo.TransientError.Network.UnknownHost') {
      errorMessage += ' Cannot connect to the server. Please check the URI.'
    } else {
      errorMessage += ` ${error.message || 'Unknown error'}`
    }
    
    alert(errorMessage)
  } finally {
    // 取消同步状态
    isSyncing.value = false
  }
}

// 添加节点类型
function addNodeType(nodeType: NodeType) {
  if (!nodeType.name) return
  
  nodeTypes.value.push(nodeType)
  
  // 重置相关状态
  showAddNodeTypeModal.value = false
}

// 添加关系类型
function addRelationshipType() {
  if (!newRelationshipType.name) return
  
  relationshipTypes.value.push({
    name: newRelationshipType.name,
    icon: newRelationshipType.icon,
    color: newRelationshipType.color
  })
  
  // 重置表单
  resetNewRelationshipType()
  showAddRelationshipTypeModal.value = false
}

// 选择节点类型
function selectNodeType(type: string) {
  activeNodeType.value = type
  activeRelationshipType.value = ''
  logService.info(`选择节点类型: ${type}`)
  // 根据选择的节点类型过滤并更新图
  filterAndUpdateGraphByNodeType(type)
}

// 根据关系类型过滤并更新图
function filterAndUpdateGraphByRelationshipType(type: string) {
  // 从原始数据中查询指定类型的边数据
  const filteredEdges = originalGraphData.edges.filter(edge => 
    edge.type === type || edge.label === type
  )
  
  // 获取与这些边相关的所有节点
  const allRelatedNodeIds = new Set(
    filteredEdges.flatMap(edge => [edge.source, edge.target])
  )
  
  const finalNodes = originalGraphData.nodes.filter(node => allRelatedNodeIds.has(node.id))
  
  // 更新当前显示的图数据
  graphData.nodes = JSON.parse(JSON.stringify(finalNodes))
  graphData.edges = JSON.parse(JSON.stringify(filteredEdges))
  
  // 更新计数
  updateCounts()
  
  // 清除选中状态，确保画布数据更新后按钮禁用状态正确反映
  clearSelection()
}

// 根据节点类型过滤并更新树图
async function filterAndUpdateGraphByNodeType(type: string) {
  // 处理'全部'类型的特殊情况
  if (type === '全部') {
    try {
      // 执行查询所有节点的Cypher查询
      // 调用新的API方法一次性查询所有节点和关系
      const { nodes, relationships } = await graphApi.queryAllGraphElements()
      
      // 更新当前显示的图数据
      graphData.nodes = JSON.parse(JSON.stringify(nodes))
      graphData.edges = JSON.parse(JSON.stringify(relationships))
          networkGraphData.nodes = []
    networkGraphData.edges = []
          console.log(`更新${type}相关节点和关系到图数据`, JSON.stringify(graphData))
      logService.info('显示全部节点和关系数据', { nodeCount: nodes.length, edgeCount: relationships.length })
    } catch (error) {
      console.error('查询所有节点失败:', error)
      logService.error('查询所有节点数据失败', error)
    }
  } else {
    try {
      // 调用新的API方法查询特定节点类型及其相关元素
      const { nodes, relationships } = await graphApi.queryNodesByTypeWithRelatedElements(type) 
      
      // 追加节点去重逻辑 - 根据id去重
      const uniqueNodesMap = new Map();
      nodes.forEach(node => {
        if (!uniqueNodesMap.has(node.id)) {
          uniqueNodesMap.set(node.id, node);
        }
      });
      const uniqueNodes = Array.from(uniqueNodesMap.values());
      
      // 追加关系去重逻辑 - 根据id去重
      const uniqueRelationshipsMap = new Map();
      relationships.forEach(rel => {
        if (rel.id && !uniqueRelationshipsMap.has(rel.id)) {
          uniqueRelationshipsMap.set(rel.id, rel);
        }
      });
      const uniqueRelationships = Array.from(uniqueRelationshipsMap.values());
      
      console.log(`原始${type}相关节点数量:`, nodes.length);
      console.log(`去重后${type}相关节点数量:`, uniqueNodes.length);
      console.log(`原始${type}相关关系数量:`, relationships.length);
      console.log(`去重后${type}相关关系数量:`, uniqueRelationships.length);
        
      // 更新当前显示的图数据，使用去重后的数据
      graphData.nodes = JSON.parse(JSON.stringify(uniqueNodes))
      graphData.edges = JSON.parse(JSON.stringify(uniqueRelationships))
          networkGraphData.nodes = []
    networkGraphData.edges = []
      // console.log(`更新${type}相关节点和关系到图数据`, JSON.stringify(graphData))
    } catch (error) {
      console.error(`查询${type}类型节点失败:`, error)
      logService.error(`查询${type}类型节点失败`, error)
    }
  }
  
  // 更新计数
  updateCounts()
  
  // 清除选中状态，确保画布数据更新后按钮禁用状态正确反映
  clearSelection()
}

// 选择关系类型
function selectRelationshipType(type: string) {
  activeRelationshipType.value = type
  activeNodeType.value = ''
  currentMode.value = 'relationship'
  
  // 根据选择的关系类型过滤并更新图
  filterAndUpdateGraphByRelationshipType(type)
}

// 获取标签计数
function getLabelCount(label: string) {
  return graphData.nodes.filter(node => {
    // 检查节点是否有labels数组，并且数组中包含指定标签
    if (Array.isArray(node.labels)) {
      return node.labels.includes(label)
    }
    // 兼容旧数据格式
    return node.label === label
  }).length
}

// 获取属性类型
function getPropertyType(value: any) {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'checkbox'
  return 'text'
}

// 格式化属性值
function formatPropertyValue(value: any) {
  if (typeof value === 'string') return `'${value}'`
  if (typeof value === 'boolean') return value.toString()
  return value
}

// 转换属性值
function convertPropertyValue(value: string, type: string) {
  switch (type) {
    case 'number':
      return parseFloat(value)
    case 'boolean':
      return value.toLowerCase() === 'true'
    default:
      return value
  }
}

// 重置新节点类型表单
function resetNewNodeType() {
  newNodeType.name = ''
  newNodeType.icon = 'fa-circle'
  newNodeType.color = '#2196F3'
  newNodeType.properties = []
}

// 重置新关系类型表单
function resetNewRelationshipType() {
  newRelationshipType.name = ''
  newRelationshipType.icon = 'fa-arrow-right'
  newRelationshipType.color = '#FF9800'
  newRelationshipType.properties = []
}

// 显示添加属性模态框
function showAddProperty(type: string) {
  propertyType.value = type
  showAddPropertyModal.value = true
}

// 重置新属性表单
function resetNewProperty() {
  newProperty.key = ''
  newProperty.value = ''
  newProperty.type = 'string'
}

// 添加新节点类型属性
function addNewNodeTypeProperty() {
  newNodeType.properties.push({ name: '', type: 'string' })
}

// 添加新关系类型属性
function addNewRelationshipTypeProperty() {
  newRelationshipType.properties.push({ name: '', type: 'string' })
}

// 移除节点类型属性
function removeNodeTypeProperty(index: number) {
  newNodeType.properties.splice(index, 1)
}

// 移除关系类型属性
function removeRelationshipTypeProperty(index: number) {
  newRelationshipType.properties.splice(index, 1)
}
</script>

<style scoped>
/* 编辑器特定样式 */
.fixed {
  position: fixed;
}

.inset-0 {
  inset: 0;
}

.z-50 {
  z-index: 50;
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
