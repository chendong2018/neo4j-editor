<template>
  <el-dialog 
    v-model="props.show" 
    title="Connect to Neo4j" 
    width="500px"
    custom-class="bg-dark-light text-white"
  >
    <div class="space-y-4">
      <div class="form-group">
        <label class="form-label" for="neo4j-uri">URI</label>
        <input 
          type="text" 
          id="neo4j-uri" 
          class="form-input" 
          value="bolt://192.168.1.210:7687" 
          placeholder="Enter Neo4j URI"
          v-model="localConnectionParams.uri"
        >
      </div>
      <div class="form-group">
        <label class="form-label" for="neo4j-user">Username</label>
        <input 
          type="text" 
          id="neo4j-user" 
          class="form-input" 
          value="neo4j" 
          placeholder="Enter username"
          v-model="localConnectionParams.username"
        >
      </div>
      <div class="form-group">
        <label class="form-label" for="neo4j-password">Password</label>
        <input 
          type="password" 
          id="neo4j-password" 
          class="form-input" 
          placeholder="Enter password"
          v-model="localConnectionParams.password"
        >
      </div>
    </div>
    <template #footer>
      <button 
        id="cancel-connect-btn" 
        class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded mr-2"
        @click="handleCancel"
      >
        Cancel
      </button>
      <button 
        id="confirm-connect-btn" 
        class="bg-accent hover:bg-blue-600 text-white py-2 px-4 rounded"
        @click="handleConnect"
      >
        Connect
      </button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Neo4jConnectionParams } from '../../api/neo4jApi'

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
  connect: [params: Neo4jConnectionParams]
}>()

// 本地连接参数
const localConnectionParams = reactive<Neo4jConnectionParams>({
  uri: 'bolt://192.168.1.210:7687',
  username: 'neo4j',
  password: '1234qwer' // Neo4j默认安装后的常见默认密码
})

// 处理取消
function handleCancel() {
  emit('update:show', false)
}

// 处理连接
function handleConnect() {
  emit('connect', { ...localConnectionParams })
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
</style>