<template>
  <el-card style="overflow: auto">
    <el-input
      style="margin-top: 10px"
      v-for="(item, index) in floodConfig"
      :key="index"
      v-model="item.value"
      :oninput="item.oninput"
    >
      <template #prepend>
        {{ item.name }}
      </template>
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
import { reactive } from "vue";
import emitter from "@/mitt";
import { Polygon } from "../../plot/graphicsDraw/areaDraw";
import { FloodAnalysis } from "./floodTool";

const floodConfig = reactive([
  {
    name: "高度",
    value: 200,
    oninput: "value=value.replace(/[^0-9.]/g,'')",
  },
  {
    name: "速度",
    value: 2,
    oninput: "value=value.replace(/[^0-9.]/g,'')",
  },
]);

let floodTool: FloodAnalysis;
var rect: Polygon | null = new Polygon();
function floodClick() {
  rect = new Polygon();
  rect.startDraw();
  emitter.on("drawEnd", createFlood);
}

function clearFloodClick() {
  floodTool.clear();
  emitter.off("drawEnd", createFlood);
}

function createFlood() {
  setTimeout(() => {
    rect.stopDraw();
    const pointArr = rect.pointList.slice(0, rect.pointList.length);
    floodTool = new FloodAnalysis(
      eval(floodConfig[0].value as unknown as string),
      0,
      1,
      pointArr,
      0.05
    );
    if (rect.areaPrimitive) {
      window.Viewer.scene.groundPrimitives.remove(rect.areaPrimitive);
    }
    rect.disable();
    rect = null;
    floodTool.start();
  }, 300);
}
</script>

<style lang="scss" scoped></style>
