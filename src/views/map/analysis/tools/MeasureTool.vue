<template>
  <el-card style="overflow: auto">
    <el-button-group v-for="(item, index) of measureList" :key="index">
      <el-button type="primary" text :icon="Edit">{{ item.name }}</el-button>
      <el-button type="primary" text :icon="Delete">清除</el-button>
    </el-button-group>
  </el-card>
</template>

<script lang="ts" setup>
import { Delete, Edit } from "@element-plus/icons-vue";

// * 测量类型
const measureList = [
  { name: "平面长度", enName: "planeLength" },
  { name: "平面面积", enName: "planeArea" },
  { name: "贴地长度", enName: "groundLength" },
  { name: "贴地面积", enName: "groundArea" },
];
</script>

<style lang="scss" scoped></style>
