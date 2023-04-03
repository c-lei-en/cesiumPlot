<template>
  <el-card style="overflow: auto">
    <el-button-group>
      <el-button type="primary" text :icon="Edit" @click="visibilityClick"
        >透视分析</el-button
      >
      <el-button
        type="primary"
        text
        :icon="Delete"
        @click="clearVisibilityClick()"
        >清除</el-button
      >
    </el-button-group>
  </el-card>
</template>

<script lang="ts" setup>
import { Delete, Edit } from "@element-plus/icons-vue";
import { VisibilityAnalysis } from "./visibilityTool";
import { onUnmounted } from "vue";

const visibilityTool = new VisibilityAnalysis();

function visibilityClick() {
  visibilityTool.analysisVisible();
}

function clearVisibilityClick() {
  visibilityTool.clearAll();
}

onUnmounted(() => {
  visibilityTool.destory();
});
</script>

<style lang="scss" scoped></style>
