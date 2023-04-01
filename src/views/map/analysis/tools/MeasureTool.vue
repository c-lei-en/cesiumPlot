<template>
  <el-card style="overflow: auto">
    <el-button-group v-for="(item, index) of measureList" :key="index">
      <el-button
        type="primary"
        text
        :icon="Edit"
        @click="measureClick(item.enName)"
        >{{ item.name }}</el-button
      >
      <el-button
        type="primary"
        text
        :icon="Delete"
        @click="clearMeasureClick(item.enName)"
        >清除</el-button
      >
    </el-button-group>
  </el-card>
</template>

<script lang="ts" setup>
import { Delete, Edit } from "@element-plus/icons-vue";
import MeasurementCalc from "./measureTool";

const measureTool = new MeasurementCalc();
// * 测量类型
const measureList = [
  { name: "平面长度", enName: "getPlaneLength" },
  { name: "平面面积", enName: "getPlaneArea" },
  { name: "贴地长度", enName: "getGroundLength" },
  { name: "贴地面积", enName: "getGroundArea" },
];

// * 开始测量
function measureClick(name: string) {
  switch (name) {
    case "getPlaneLength":
      measureTool[name]();
      break;
    case "getPlaneArea":
      measureTool[name]();
      break;
    case "getGroundLength":
      measureTool[name]();
      break;
    case "getGroundArea":
      measureTool[name]();
      break;
    default:
      break;
  }
}

// * 清除测量结果
const clearMeasureClick = (name: string) => {
  measureTool.clearOne(name);
};
</script>

<style lang="scss" scoped></style>
