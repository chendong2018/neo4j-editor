<template>
  <aside class="w-80 bg-dark-light border-l border-gray-800 flex flex-col">
    <!-- Update Node Properties Panel -->
    <div id="node-properties-panel" class="panel  border-t border-gray-800" v-if="currentMode !== 'node' && currentMode !== 'relationship'">
      <div class="panel-header">
        <span >Node Properties</span>
        <!-- <button 
          id="add-property-btn" 
          class="text-xs bg-accent hover:bg-blue-600 text-white py-1 px-2 rounded"
          @click="$emit('add-node-property', 'node')"
        >
          <i class="fa fa-plus mr-1"></i> Add Property
        </button> -->
      </div>
      <div class="panel-content">
        <div v-if="!selectedNode.id" class="text-gray-400 text-sm italic text-center py-4">
          Update Relationship
        </div>
        <div v-else>
          <div class="form-group">
            <label class="form-label" for="node-label">ID</label>
            <input 
              type="text" 
              id="node-id" 
              class="form-input" 
              placeholder="Enter node ID"
              v-model="props.selectedNode.id"
              readonly
            >
          </div>
          <div>
            <label class="form-label" for="node-label">Label</label>
            <input 
              type="text" 
              id="node-label" 
              class="form-input" 
              placeholder="Enter node label"
              v-model="props.selectedNode.label"
            >
          </div>
          <div id="node-properties-container">
            <div 
              v-for="(value, key) in props.selectedNode.properties" 
              :key="key"
              class="form-group"
            >
              <label class="form-label" :for="`property-${key}`">属性：{{ key }}</label>
              <input 
                :type="getPropertyType(value)"
                :id="`property-${key}`" 
                class="form-input" 
                placeholder="Enter value"
                :value="key === 'id' ? formatIdValue(value) : props.selectedNode.properties[key]"
                :readonly="key === 'id'"
                :class="{ 'bg-gray-800 cursor-not-allowed': key === 'id' }"
                @input="updateNodeProperty(key, $event)"
              >
              <button 
                class="text-red-400 text-xs mt-1" 
                @click="$emit('deleteNodeProperty', key)"
                v-if="key !== 'id'"
              >
                删除
              </button>
            </div>
          </div>
          <div class="mt-4 flex justify-end">
            <button 
              id="apply-node-properties-btn" 
              class="bg-accent hover:bg-blue-600 text-white py-1 px-4 rounded text-sm"
              @click="handleApplyNodeProperties"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Create New Node Panel --> 
     <div v-if="props.selectedNode.id && currentMode === 'node'" class="border-t border-gray-800">
      <div class="panel-header">
        <span>Create New Node</span>
          <button 
            class="bg-green-600 hover:bg-green-700 text-white py-1 px-4 rounded text-sm"
            @click="toggleAddProperty"
          >
          添加节点属性
          </button> 
      </div>
      <div class="panel-content">
        <div class="form-group">
          <label class="form-label">Label</label>
          <input 
            type="text" 
            class="form-input" 
            v-model="newNodeForm.label"
            placeholder="Enter node label"
          >
        </div>
        <div class="form-group">
          
          <!-- 已添加的属性列表 -->
          <div v-if="Object.keys(newNodeForm.properties).length > 0" class="mt-3">
            <div 
              v-for="(value, key) in newNodeForm.properties" 
              :key="key"
              class="form-group border-l-2 border-blue-500 pl-2 mb-2"
            >
              <div class="flex justify-between items-center">
                <label class="form-label text-sm font-medium">属性: {{ key }}</label>
                <button 
                  class="text-red-400 text-xs"
                  @click="deleteProperty(key)"
                >
                  X
                </button>
              </div>
              <input 
                type="text" 
                class="form-input text-sm" 
                v-model="newNodeForm.properties[key]"
                placeholder="Enter value"
              >
            </div>
          </div> 
      
          
          <!-- 新属性输入区域 -->
          <div v-if="showNewProperty.visible" class="mt-2 p-2 border border-gray-700 rounded">
            <div class="form-group">
              <label class="form-label text-xs">属性名 (Key)</label>
              <input 
                type="text" 
                class="form-input text-sm" 
                v-model="showNewProperty.key"
                placeholder="Enter property key"
              >
            </div>
            <div class="form-group">
              <label class="form-label text-xs">属性值 (Value)</label>
              <input 
                type="text" 
                class="form-input text-sm" 
                v-model="showNewProperty.value"
                placeholder="Enter property value"
              >
            </div>
            <div class="flex space-x-2 mt-2">
              <button 
                class="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-xs"
                @click="addProperty"
              >
                保存属性
              </button>
              <button 
                class="bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-xs"
                @click="cancelAddProperty"
              >
                取消
              </button>
            </div>
          </div>
        </div> 
      </div>
      <div class="panel-header">
        <span>New Relationship</span>
         <button 
            class="bg-green-600 hover:bg-green-700 text-white py-1 px-4 rounded text-sm"
            @click="toggleAddRelationshipProperty"
          >
            添加边属性
          </button>
      </div>
      <div class="panel-content">
        <div class="form-group">
          <label class="form-label">Label</label>
          <input 
            type="text" 
            class="form-input" 
            v-model="newRelationshipForm.label"
            placeholder="Enter relationship label"
          >
        </div>
        <div class="form-group">
          <!-- 已添加的边属性列表 -->
          <div v-if="Object.keys(newRelationshipForm.properties).length > 0" class="mt-3">
            <div 
              v-for="(value, key) in newRelationshipForm.properties" 
              :key="key"
              class="form-group border-l-2 border-blue-500 pl-2 mb-2"
            >
              <div class="flex justify-between items-center">
                <label class="form-label text-sm font-medium">属性: {{ key }}</label>
                <button 
                  class="text-red-400 text-xs"
                  @click="deleteRelationshipProperty(key)"
                  v-if="key !== 'name'"
                >
                  X
                </button>
              </div>
              <input 
                type="text" 
                class="form-input text-sm" 
                v-model="newRelationshipForm.properties[key]"
                placeholder="Enter value"
              >
            </div>
          </div>
          
          <!-- 新边属性输入区域 -->
          <div v-if="showNewRelationshipProperty.visible" class="mt-2 p-2 border border-gray-700 rounded">
            <div class="form-group">
              <label class="form-label text-xs">属性名 (Key)</label>
              <input 
                type="text" 
                class="form-input text-sm" 
                v-model="showNewRelationshipProperty.key"
                placeholder="Enter property key"
              >
            </div>
            <div class="form-group">
              <label class="form-label text-xs">属性值 (Value)</label>
              <input 
                type="text" 
                class="form-input text-sm" 
                v-model="showNewRelationshipProperty.value"
                placeholder="Enter property value"
              >
            </div>
            <div class="flex space-x-2 mt-2">
              <button 
                class="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-xs"
                @click="addRelationshipProperty"
              >
                保存属性
              </button>
              <button 
                class="bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-xs"
                @click="cancelAddRelationshipProperty"
              >
                取消
              </button>
            </div>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
         
          <button 
            class="bg-green-600 hover:bg-green-700 text-white py-1 px-4 rounded text-sm"
            @click="createRelationship"
            :disabled="isLoading"
          >
            {{ isLoading ? '创建中...' : '新增节点' }}
          </button>
        </div>
      </div>
    </div>
    
     <!-- Create relationship -->
    <div v-if="(props.selectedNode.id || props.relationshipCreationMode.isActive) && currentMode === 'relationship'" class="border-t border-gray-1200">
      <div class="panel-header">
        <span>New Relationship</span>
         <button 
            class="bg-green-600 hover:bg-green-700 text-white py-1 px-4 rounded text-sm"
            @click="toggleAddRelationshipProperty"
          >
            添加边属性
          </button>
      </div>
      <div class="panel-content">
         <div class="form-group space-y-2">
          <div>
            <label class="form-label block text-sm font-medium mb-1">开始节点</label>
            <div class="bg-gray-800 p-2 rounded">
              <div class="text-sm">ID: {{ props.relationshipCreationMode.startNodeId || props.selectedNode.id }}</div>
              <div class="text-sm">Label: {{ props.relationshipCreationMode.startNodeLabel || props.selectedNode.label }}</div>
              <div class="text-sm">Name: {{ (props.relationshipCreationMode.startNodeProperties && props.relationshipCreationMode.startNodeProperties.name) || (props.selectedNode.properties && props.selectedNode.properties.name) || 'N/A' }}</div>
            </div>
          </div>
          <div>
            <label class="form-label block text-sm font-medium mb-1">结束节点</label>
            <div v-if="newRelationshipForm.targetNodeId" class="bg-gray-800 p-2 rounded">
              <div class="text-sm">ID: {{ newRelationshipForm.targetNodeId }}</div>
              <div class="text-sm">Label: {{ newRelationshipForm.targetNodeLabel }}</div>
              <div class="text-sm">Name: {{ newRelationshipForm.targetNodeName || 'N/A' }}</div>
            </div>
            <div v-else class="bg-gray-800 p-2 rounded text-gray-400 text-sm">
              请选择目标节点
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Label</label>
          <input 
            type="text" 
            class="form-input" 
            v-model="newRelationshipForm.label"
            placeholder="Enter relationship label"
          >
        </div>
        <div class="form-group">
          <!-- 已添加的边属性列表 -->
          <div v-if="Object.keys(newRelationshipForm.properties).length > 0" class="mt-3">
            <div 
              v-for="(value, key) in newRelationshipForm.properties" 
              :key="key"
              class="form-group border-l-2 border-blue-500 pl-2 mb-2"
            >
              <div class="flex justify-between items-center">
                <label class="form-label text-sm font-medium">属性: {{ key }}</label>
                <button 
                  class="text-red-400 text-xs"
                  @click="deleteRelationshipProperty(key)"
                >
                  X
                </button>
              </div>
              <input 
                type="text" 
                class="form-input text-sm" 
                v-model="newRelationshipForm.properties[key]"
                placeholder="Enter value"
              >
            </div>
          </div>
          
          <!-- 新边属性输入区域 -->
          <div v-if="showNewRelationshipProperty.visible" class="mt-2 p-2 border border-gray-700 rounded">
            <div class="form-group">
              <label class="form-label text-xs">属性名 (Key)</label>
              <input 
                type="text" 
                class="form-input text-sm" 
                v-model="showNewRelationshipProperty.key"
                placeholder="Enter property key"
              >
            </div>
            <div class="form-group">
              <label class="form-label text-xs">属性值 (Value)</label>
              <input 
                type="text" 
                class="form-input text-sm" 
                v-model="showNewRelationshipProperty.value"
                placeholder="Enter property value"
              >
            </div>
            <div class="flex space-x-2 mt-2">
              <button 
                class="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-xs"
                @click="addRelationshipProperty"
              >
                保存属性
              </button>
              <button 
                class="bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-xs"
                @click="cancelAddRelationshipProperty"
              >
                取消
              </button>
            </div>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
         
          <button 
            class="bg-green-600 hover:bg-green-700 text-white py-1 px-4 rounded text-sm"
            @click="createRelationship"
            :disabled="isLoading"
          >
            {{ isLoading ? '创建中...' : '新增边' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Relationship Properties Panel -->
    <div id="relationship-properties-panel" class="panel border-t border-gray-800" v-if="props.selectedRelationship">
      <div class="panel-header">
        <span>Relationship Properties2</span>
        <!-- <button 
          id="add-relationship-property-btn" 
          class="text-xs bg-accent hover:bg-blue-600 text-white py-1 px-2 rounded"
          @click="$emit('add-relationship-property', 'relationship')"
        >
          <i class="fa fa-plus mr-1"></i> Add Property
        </button> -->
      </div>
      <div class="panel-content">
        <div class="form-group">
          <label class="form-label" for="relationship-label">Label</label>
          <input 
            type="text" 
            id="relationship-label" 
            class="form-input" 
            placeholder="Enter relationship label"
            v-model="props.selectedRelationship.type"
          >
        </div>
        <div id="relationship-properties-container">
          <div 
            v-for="(value, key) in props.selectedRelationship.properties" 
            :key="key"
            class="form-group"
          >
            <label class="form-label" :for="`rel-property-${key}`">{{ key }}</label>
            <input 
                :type="getPropertyType(value)"
                :id="`rel-property-${key}`" 
                class="form-input" 
                placeholder="Enter value"
                :value="key === 'id' ? formatIdValue(value) : props.selectedRelationship.properties[key]"
                :readonly="key === 'id'"
                :class="{ 'bg-gray-800 cursor-not-allowed': key === 'id' }"
                @input="updateRelationshipProperty(key, $event)"
              >
            <button 
                class="text-red-400 text-xs mt-1" 
                @click="$emit('deleteRelationshipProperty', key)"
                v-if="key !== 'id'"
              >
                删除
              </button>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button 
            id="apply-relationship-properties-btn" 
            class="bg-accent hover:bg-blue-600 text-white py-1 px-4 rounded text-sm"
            @click="$emit('applyRelationshipProperties')"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
    
    <!-- Batch Operations Panel -->
    <div id="batch-operations-panel" class="panel border-t border-gray-800 mt-auto"
      v-if="currentMode !== 'node' && currentMode !== 'relationship'">
      <div class="panel-header">
        <span>Batch Operations</span>
      </div>
      <div class="panel-content">
        <div class="form-group">
          <label class="form-label" for="batch-property-key">Property Key</label>
          <input 
            type="text" 
            id="batch-property-key" 
            class="form-input" 
            placeholder="Enter property key"
            v-model="props.batchProperty.key"
          >
        </div>
        <div class="form-group">
          <label class="form-label" for="batch-property-value">Property Value</label>
          <input 
            type="text" 
            id="batch-property-value" 
            class="form-input" 
            placeholder="Enter property value"
            v-model="props.batchProperty.value"
          >
        </div>
        <div class="mt-4 flex justify-end">
          <button 
            id="apply-batch-properties-btn" 
            class="bg-accent hover:bg-blue-600 text-white py-1 px-4 rounded text-sm"
            @click="$emit('applyBatchProperties')"
          >
            Apply to Selected
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { ref, watch, reactive } from 'vue'
import type { GraphNode, GraphEdge } from '../../types/graph'
import { graphApi } from '../../api/graphApi'

// Props
const props = defineProps({
  selectedNode: {
    type: Object as PropType<{ id: string; label: string; properties: Record<string, any> }>,
    required: true
  },
  selectedRelationship: {
    type: Object as PropType<GraphEdge | null>,
    default: null
  },
  batchProperty: {
    type: Object as PropType<{ key: string; value: string }>,
    required: true
  },
  currentMode: {
    type: String,
    default: 'select'
  },
  relationshipCreationMode: {
    type: Object,
    default: () => ({
      isActive: false,
      startNodeId: '',
      startNodeLabel: '',
      startNodeProperties: {},
      提示信息: ''
    })
  }
})

// 新节点表单数据
const newNodeForm = reactive({
  label: '',
  properties: {
    name: ''
  }
})

// 新边表单数据
const newRelationshipForm = reactive({
  label: '',
  properties: {},
  targetNodeId: '',
  targetNodeLabel: '',
  targetNodeName: ''
})

// 新属性添加状态管理
const showNewProperty = reactive({
  visible: false,
  key: '',
  value: ''
})

// 新边属性添加状态管理
const showNewRelationshipProperty = reactive({
  visible: false,
  key: '',
  value: ''
})

// 加载状态管理
const isLoading = ref(false)

// 监听选中节点的变化，自动设置新节点的label
watch(() => props.selectedNode, (newNode) => {
  if (newNode && newNode.label) {
    newNodeForm.label = newNode.label
  }
}, { deep: true, immediate: true })

// Emits
const emit = defineEmits<{
  'add-node-property': [propertyType: string]
  'add-relationship-property': [propertyType: string]
  applyNodeProperties: [nodeId: string, properties: Record<string, any>, label?: string]
  applyRelationshipProperties: []
  deleteNodeProperty: [key: string]
  deleteRelationshipProperty: [key: string]
  applyBatchProperties: []
  createNode: [nodeData: { label: string, properties: Record<string, any> }]
  createRelationship: [relationshipData: { label: string, properties: Record<string, any> }]
}>()

// 格式化ID值显示
function formatIdValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    // 如果对象有toString方法且不是Object.prototype.toString
    if (value.toString && value.toString !== Object.prototype.toString) {
      return value.toString()
    }
    // 尝试获取对象的主要标识符
    if (value.id) return String(value.id)
    if (value._id) return String(value._id)
    // 作为最后的选择，返回JSON字符串的前50个字符
    try {
      return JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '')
    } catch {
      return '[Complex Object]'
    }
  }
  return String(value)
}

// 更新节点属性
function updateNodeProperty(key: string, event: Event) {
  if (key !== 'id') {
    const target = event.target as HTMLInputElement
    props.selectedNode.properties[key] = target.value
  }
}

// 更新关系属性
function updateRelationshipProperty(key: string, event: Event) {
  if (key !== 'id') {
    const target = event.target as HTMLInputElement
    props.selectedRelationship!.properties[key] = target.value
  }
}

// 处理节点属性应用
function handleApplyNodeProperties() {
  // 提取节点ID
  const nodeId = props.selectedNode.id
  
  // 复制属性，不包括id属性（如果存在）
  const properties = { ...props.selectedNode.properties }
  if (properties.hasOwnProperty('id')) {
    delete properties.id
  }
  
  // 提取标签信息
  const label = props.selectedNode.label
  
  // 触发更新事件，传递节点ID、属性和标签
  emit('applyNodeProperties', nodeId, properties, label)
}

// 获取属性类型
function getPropertyType(value: any) {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'checkbox'
  return 'text'
}

// 切换显示/隐藏属性输入框
function toggleAddProperty() {
  showNewProperty.visible = !showNewProperty.visible
  if (showNewProperty.visible) {
    // 重置输入框
    showNewProperty.key = ''
    showNewProperty.value = ''
  }
}


// 添加新属性
function addProperty() {
  const key = showNewProperty.key.trim()
  const value = showNewProperty.value.trim()
  
  if (key) {
    // 添加到新节点的属性中
    newNodeForm.properties[key] = value
    // 隐藏输入框
    showNewProperty.visible = false
  }
}

// 取消添加属性
function cancelAddProperty() {
  showNewProperty.visible = false
}

// 删除属性
function deleteProperty(key) {
  if (key && key !== 'name') {
    delete newNodeForm.properties[key]
  }
}

// 切换边属性输入框显示/隐藏
function toggleAddRelationshipProperty() {
  showNewRelationshipProperty.visible = !showNewRelationshipProperty.visible
  if (showNewRelationshipProperty.visible) {
    showNewRelationshipProperty.key = ''
    showNewRelationshipProperty.value = ''
  }
}

// 添加边属性
function addRelationshipProperty() {
  if (showNewRelationshipProperty.key.trim()) {
    newRelationshipForm.properties[showNewRelationshipProperty.key.trim()] = showNewRelationshipProperty.value.trim()
    showNewRelationshipProperty.visible = false
  }
}

// 取消添加边属性
function cancelAddRelationshipProperty() {
  showNewRelationshipProperty.visible = false
}

// 删除边属性
function deleteRelationshipProperty(key) {
  if (key) {
    delete newRelationshipForm.properties[key]
  }
}

// 创建新关系
async function createRelationship() {
  if (!props.selectedNode) {
    alert('请先选择一个节点作为起点')
    return
  }
  
  if (!newRelationshipForm.label) {
    alert('请输入关系类型')
    return
  }
  
  try {
    // 设置加载状态
    isLoading.value = true
    
    // 1. 创建新节点（使用表单中的label和properties）
    const nodeLabel = newNodeForm.label || 'Node' // 如果没有设置label，使用默认的'Node'
    const newNode = await graphApi.createNode(nodeLabel, newNodeForm.properties)
    
    // 2. 创建从选中节点到新节点的关系
    const relationship = await graphApi.createRelationship(
      props.selectedNode.id,
      newNode.id,
      newRelationshipForm.label,
      newRelationshipForm.properties
    )
    
    // 3. 发出事件通知父组件
    emit('createRelationship', {
      label: newRelationshipForm.label,
      properties: newRelationshipForm.properties,
      sourceId: props.selectedNode.id,
      targetId: newNode.id
    })
    
    // 4. 重置表单
    newRelationshipForm.label = ''
    newRelationshipForm.properties = {}
    
    alert('节点和关系创建成功')
  } catch (error: any) {
    console.error('创建节点和关系失败:', error)
    // 更具体的错误提示
    if (error.response?.data?.message) {
      alert(`创建失败: ${error.response.data.message}`)
    } else if (error.message) {
      alert(`创建失败: ${error.message}`)
    } else {
      alert('创建失败，请检查网络连接或数据库状态后重试')
    }
  } finally {
    // 无论成功失败，都要重置加载状态
    isLoading.value = false
  }
}

// 创建新节点
function createNewNode() {
  if (!newNodeForm.label) {
    alert('Label is required to create a new node')
    return
  }
  
  // 发送创建节点事件
  emit('createNode', {
    label: newNodeForm.label,
    properties: { ...newNodeForm.properties }
  })
  
  // 重置表单
  newNodeForm.label = ''
  newNodeForm.properties.name = ''
}
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
  max-height: 300px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 12px;
}

.form-label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: #e0e0e0;
}

.form-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #333;
  border-radius: 4px;
  background-color: #1a1a1a;
  color: #e0e0e0;
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: #2196F3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
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