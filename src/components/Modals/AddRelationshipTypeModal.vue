<template>
  <el-dialog 
    v-model="props.show" 
    title="Add Relationship Type" 
    width="500px"
    custom-class="bg-dark-light text-white"
  >
    <div class="space-y-4">
      <div class="form-group">
        <label class="form-label" for="new-relationship-type-name">Name</label>
        <input 
          type="text" 
          id="new-relationship-type-name" 
          class="form-input" 
          placeholder="Enter relationship type name"
          v-model="newRelationshipType.name"
        >
      </div>
      <div class="form-group">
        <label class="form-label" for="new-relationship-type-color">Color</label>
        <input 
          type="color" 
          id="new-relationship-type-color" 
          class="form-input" 
          value="#FF9800"
          v-model="newRelationshipType.color"
        >
      </div>
      
      <!-- Properties Section -->
      <div class="mt-4">
        <div class="flex justify-between items-center mb-2">
          <label class="form-label">Properties</label>
          <button 
            id="add-new-relationship-type-property-btn" 
            class="text-xs bg-accent hover:bg-blue-600 text-white py-1 px-2 rounded"
            @click="addProperty"
          >
            <i class="fa fa-plus mr-1"></i> Add Property
          </button>
        </div>
        <div 
          id="new-relationship-type-properties-container" 
          class="border border-gray-700 rounded p-2 bg-dark rounded max-h-60 overflow-y-auto space-y-2"
        >
          <div v-if="!newRelationshipType.properties.length" class="text-gray-400 text-sm italic">
            No properties added yet. Click the button above to add properties.
          </div>
          <div v-for="(prop, index) in newRelationshipType.properties" :key="index" class="flex items-center">
            <input 
              type="text" 
              class="form-input text-sm flex-1 mr-2" 
              placeholder="Property name"
              v-model="prop.name"
            >
            <select class="form-input text-sm w-24 mr-2" v-model="prop.type">
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
            </select>
            <button class="text-red-400" @click="removeProperty(index)">
              <i class="fa fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <button 
        id="cancel-add-relationship-type-btn" 
        class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded mr-2"
        @click="handleCancel"
      >
        Cancel
      </button>
      <button 
        id="confirm-add-relationship-type-btn" 
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
import type { RelationshipType } from '../../types/graph'

// Props
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits<{
  'update:show': [value: boolean]
  add: [relationshipType: RelationshipType]
}>()

// 新关系类型表单数据
interface Property { name: string; type: string }

interface RelationshipTypeForm extends RelationshipType {
  properties: Property[]
}

const newRelationshipType = reactive<RelationshipTypeForm>({
  name: '',
  icon: 'fa-arrow-right',
  color: '#FF9800',
  properties: []
})

// 添加属性
function addProperty() {
  newRelationshipType.properties.push({ name: '', type: 'string' })
}

// 移除属性
function removeProperty(index: number) {
  newRelationshipType.properties.splice(index, 1)
}

// 重置表单
function resetForm() {
  newRelationshipType.name = ''
  newRelationshipType.icon = 'fa-arrow-right'
  newRelationshipType.color = '#FF9800'
  newRelationshipType.properties = []
}

// 处理取消
function handleCancel() {
  resetForm()
  emit('update:show', false)
}

// 处理添加
function handleAdd() {
  if (!newRelationshipType.name) return
  
  // 只传递必要的字段
  const relationshipTypeToAdd: RelationshipType = {
    name: newRelationshipType.name,
    icon: newRelationshipType.icon,
    color: newRelationshipType.color
  }
  
  emit('add', relationshipTypeToAdd)
  resetForm()
  emit('update:show', false)
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

select.form-input {
  cursor: pointer;
}
</style>