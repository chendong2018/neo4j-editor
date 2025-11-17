<template>
  <el-dialog 
    v-model="props.show" 
    title="Add Property" 
    width="500px"
    custom-class="bg-dark-light text-white"
  >
    <div class="space-y-4">
      <div class="form-group">
        <label class="form-label" for="new-property-key">Key</label>
        <input 
          type="text" 
          id="new-property-key" 
          class="form-input" 
          placeholder="Enter property key"
          v-model="newProperty.key"
        >
      </div>
      <div class="form-group">
        <label class="form-label" for="new-property-value">Value</label>
        <input 
          type="text" 
          id="new-property-value" 
          class="form-input" 
          placeholder="Enter property value"
          v-model="newProperty.value"
        >
      </div>
      <div class="form-group">
        <label class="form-label" for="new-property-type">Type</label>
        <select 
          id="new-property-type" 
          class="form-input"
          v-model="newProperty.type"
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
        </select>
      </div>
    </div>
    <template #footer>
      <button 
        id="cancel-add-property-btn" 
        class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded mr-2"
        @click="handleCancel"
      >
        Cancel
      </button>
      <button 
        id="confirm-add-property-btn" 
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

// Props
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  propertyType: {
    type: String,
    default: 'node',
    validator: (value: string) => ['node', 'relationship'].includes(value)
  }
})

// Emits
const emit = defineEmits<{
  'update:show': [value: boolean]
  add: [property: { key: string; value: any; type: string }]
}>()

// 新属性表单数据
const newProperty = reactive({
  key: '',
  value: '',
  type: 'string'
})

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

// 重置表单
function resetForm() {
  newProperty.key = ''
  newProperty.value = ''
  newProperty.type = 'string'
}

// 处理取消
function handleCancel() {
  resetForm()
  emit('update:show', false)
}

// 处理添加
function handleAdd() {
  if (!newProperty.key) return
  
  const convertedValue = convertPropertyValue(newProperty.value, newProperty.type)
  
  emit('add', {
    key: newProperty.key,
    value: convertedValue,
    type: newProperty.type
  })
  
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

select.form-input {
  cursor: pointer;
}
</style>