<template>
  <el-card style="overflow: auto">
    <el-input style="margin-top: 10px" v-model="clipDeep">
      <template #prepend> 开挖深度 </template>
    </el-input>
    <el-button-group>
      <el-button type="primary" text :icon="Edit" @click="floodClick"
        >绘制</el-button
      >
      <el-button type="primary" text :icon="Delete" @click="clearFloodClick"
        >清除</el-button
      >
    </el-button-group>
  </el-card>
</template>

<script lang="ts" setup>
import { Delete, Edit } from "@element-plus/icons-vue";
import { TerrainCutting } from "./terrainCutting";
import { ref } from "vue";

let clipDeep = ref(20);

const terrainCutting = new TerrainCutting();

function floodClick() {
  terrainCutting.create(clipDeep.value);
}

function clearFloodClick() {
  terrainCutting.stop();
}
</script>

<style lang="scss" scoped></style>
