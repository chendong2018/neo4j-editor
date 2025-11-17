<script setup lang="ts">
import Neo4jEditor from './views/Neo4jEditor.vue'
</script>

<template>
  <Neo4jEditor />
</template>

<style scoped>
/* 主应用样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
