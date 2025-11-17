<template>
  <div class="cypher-panel h-48 border-t border-gray-800 bg-dark-light">
    <div class="panel-header">
      <span>Cypher Preview</span>
      <div>
        <button 
          id="run-cypher-btn" 
          class="text-xs bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded mr-2"
          @click="$emit('runCypher')"
        >
          <i class="fa fa-play mr-1"></i> Run
        </button>
        <button 
          id="clear-cypher-btn" 
          class="text-xs bg-gray-600 hover:bg-gray-700 text-white py-1 px-2 rounded"
          @click="$emit('clearCypher')"
        >
          <i class="fa fa-times mr-1"></i> Clear
        </button>
      </div>
    </div>
    <div class="panel-content p-0">
      <textarea 
        id="cypher-editor" 
        class="cypher-editor w-full h-[calc(100%-40px)]" 
        placeholder="Cypher query will appear here..." 
        title="Cypher query editor"
        :value="cypherQuery"
        readonly
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
const props = defineProps({
  cypherQuery: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits<{
  runCypher: []
  clearCypher: []
}>()
</script>

<style scoped>
.cypher-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.2);
  font-weight: 500;
}

.panel-content {
  flex: 1;
  overflow: hidden;
}

.cypher-editor {
  width: 100%;
  height: 100%;
  padding: 12px;
  border: none;
  background-color: #1a1a1a;
  color: #e0e0e0;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
}

.cypher-editor::placeholder {
  color: #666;
}

/* 自定义滚动条 */
.cypher-editor {
  scrollbar-width: thin;
}

.cypher-editor::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.cypher-editor::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.cypher-editor::-webkit-scrollbar-thumb {
  background-color: #333333;
  border-radius: 4px;
}

.cypher-editor::-webkit-scrollbar-thumb:hover {
  background-color: #444444;
}
</style>