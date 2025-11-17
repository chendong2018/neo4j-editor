<template>
  <el-dialog 
    v-model="props.modelValue" 
    title="Add Node Type" 
    width="500px"
    custom-class="bg-dark-light text-white"
  >
    <div class="space-y-4">
      <div class="form-group">
        <label class="form-label" for="new-node-type-name">Name</label>
        <input 
          type="text" 
          id="new-node-type-name" 
          class="form-input" 
          placeholder="Enter node type name"
          v-model="newNodeType.name"
        >
      </div>
      <div class="form-group">
        <label class="form-label" for="new-node-type-icon">Icon</label>
        <select 
          id="new-node-type-icon" 
          class="form-input"
          v-model="newNodeType.icon"
        >
          <option value="fa-circle">Circle</option>
          <option value="fa-square">Square</option>
          <option value="fa-triangle">Triangle</option>
          <option value="fa-star">Star</option>
          <option value="fa-user">User</option>
          <option value="fa-film">Film</option>
          <option value="fa-book">Book</option>
          <option value="fa-building">Building</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="new-node-type-color">Color</label>
        <input 
          type="color" 
          id="new-node-type-color" 
          class="form-input" 
          value="#2196F3"
          v-model="newNodeType.color"
        >
      </div>
      
      <!-- Properties Section -->
      <div class="mt-4">
        <div class="flex justify-between items-center mb-2">
          <label class="form-label">Properties</label>
          <button 
            id="add-new-node-type-property-btn" 
            class="text-xs bg-accent hover:bg-blue-600 text-white py-1 px-2 rounded"
            @click="addProperty"
          >
            <i class="fa fa-plus mr-1"></i> Add Property
          </button>
        </div>
        <div 
          id="new-node-type-properties-container" 
          class="border border-gray-700 rounded p-2 bg-dark rounded max-h-60 overflow-y-auto space-y-2"
        >
          <div v-if="!newNodeType.properties.length" class="text-gray-400 text-sm italic">
            No properties added yet. Click the button above to add properties.
          </div>
          <div v-for="(prop, index) in newNodeType.properties" :key="index" class="flex items-center space-x-2">
            <input 
              type="text" 
              class="form-input text-sm flex-1" 
              placeholder="Property name"
              v-model="prop.name"
            >
            <select class="form-input text-sm w-24" v-model="prop.type">
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
            </select>
            <input 
              type="text" 
              class="form-input text-sm flex-1" 
              :placeholder="`Property value (${prop.type})`"
              v-model="prop.value"
            >
            <button class="text-red-400 px-2" @click="removeProperty(index)">
              <i class="fa fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <button 
        id="cancel-add-node-type-btn" 
        class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded mr-2"
        @click="handleCancel"
      >
        Cancel
      </button>
      <button 
        id="confirm-add-node-type-btn" 
        class="bg-accent hover:bg-blue-600 text-white py-2 px-4 rounded"
        @click="handleAdd"
      >
        Add
      </button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { NodeType } from '../../types/graph'
import { graphApi } from '../../api/graphApi'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // 可选的new-node-type prop，用于初始化表单数据
  newNodeType: {
    type: Object,
    default: undefined
  }
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  add: [nodeType: NodeType]
}>()

// 新节点类型表单数据
interface Property { name: string; type: string; value: string }

interface NodeTypeForm extends NodeType {
  properties: Property[]
}

const newNodeType = reactive<NodeTypeForm>(props.newNodeType || {
  name: '',
  icon: 'fa-circle',
  color: '#2196F3',
  properties: []
})

// 添加属性
function addProperty() {
  newNodeType.properties.push({ name: '', type: 'string', value: '' })
}

// 移除属性
function removeProperty(index: number) {
  newNodeType.properties.splice(index, 1)
}

// 重置表单
function resetForm() {
  newNodeType.name = ''
  newNodeType.icon = 'fa-circle'
  newNodeType.color = '#2196F3'
  newNodeType.properties = []
}

// 处理取消
function handleCancel() {
  resetForm()
  emit('update:modelValue', false)
}

// 处理添加
async function handleAdd() {
  if (!newNodeType.name) return
  
  // 准备节点属性
  const nodeProperties: Record<string, any> = {}
  newNodeType.properties.forEach(prop => {
    if (prop.name && prop.value !== undefined && prop.value !== null) {
      // 根据属性类型转换值
      switch (prop.type) {
        case 'number':
          nodeProperties[prop.name] = parseFloat(prop.value)
          break
        case 'boolean':
          nodeProperties[prop.name] = prop.value.toLowerCase() === 'true'
          break
        default:
          nodeProperties[prop.name] = prop.value
      }
    }
  })
  
  try {
    // 调用API创建节点
    console.log(`创建节点: 标签=${newNodeType.name}, 属性=`, nodeProperties)
    await graphApi.createNode(newNodeType.name, nodeProperties)
    
    // 只传递必要的字段给父组件
    const nodeTypeToAdd: NodeType = {
      name: newNodeType.name,
      icon: newNodeType.icon,
      color: newNodeType.color
    }
    
    emit('add', nodeTypeToAdd)
    resetForm()
    emit('update:modelValue', false)
    
    alert('节点创建成功！')
  } catch (error) {
    console.error('创建节点失败:', error)
    alert('创建节点失败，请检查连接和输入信息')
  }
}
</script>

<style scoped>
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #e0e0e0;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
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

.form-input[type="color"] {
  height: 40px;
  padding: 2px;
}

.text-red-400 {
  cursor: pointer;
}

select.form-input {
  cursor: pointer;
}

.space-x-2 > * {
  margin-right: 8px;
}

.space-x-2 > *:last-child {
  margin-right: 0;
}
</style>