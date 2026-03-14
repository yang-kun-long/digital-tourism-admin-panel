<template>
  <router-view />
</template>

<script setup lang="ts">
// 主应用现在只负责渲染路由视图
// 所有页面逻辑都在各自的路由组件中
</script>

<style>
#app {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>
