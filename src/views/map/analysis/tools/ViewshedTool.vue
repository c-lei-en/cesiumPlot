<template>
  <el-card style="overflow: auto">
    <el-input
      style="margin-top: 10px"
      v-for="(item, index) in viewshedConfig"
      :key="index"
      v-model="item.value"
      :oninput="item.oninput"
    >
      <template #prepend>
        {{ item.name }}
      </template>
    </el-input>
    <el-button-group>
      <el-button type="primary" text :icon="Edit" @click="viewshedClick"
        >可视域分析</el-button
      >
      <el-button
        type="primary"
        text
        :icon="Delete"
        @click="clearViewshedClick()"
        >清除</el-button
      >
    </el-button-group>
  </el-card>
</template>

<script lang="ts" setup>
import { Delete, Edit } from "@element-plus/icons-vue";
import { reactive } from "vue";
import { ViewshedAnalysis } from "./viewshedTool/index";
import {
  Color,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
} from "cesium";

const viewshedConfig = reactive([
  {
    name: "航向角",
    value: 0,
    oninput: "value=value.replace(/[^0-9.]/g,'')",
  },
  {
    name: "俯仰角",
    value: 0,
    oninput: "value=value.replace(/[^0-9.]/g,'')",
  },
  {
    name: "可视域水平夹角",
    value: 90,
    oninput: "value=value.replace(/[^0-9.]/g,'')",
  },
  {
    name: "可视域垂直夹角",
    value: 60,
    oninput: "value=value.replace(/[^0-9.]/g,'')",
  },
]);
let viewshedList = [];
let drawHandler = new ScreenSpaceEventHandler(window.Viewer.scene.canvas);
function viewshedClick() {
  drawHandler = new ScreenSpaceEventHandler(window.Viewer.scene.canvas);
  // * 监测鼠标左击事件
  drawHandler.setInputAction((event) => {
    let position = event.position;
    if (!defined(position)) return;
    let ray = window.Viewer.camera.getPickRay(position);
    if (!defined(ray)) return;
    let cartesian = window.Viewer.scene.globe.pick(ray, window.Viewer.scene);
    if (!defined(cartesian)) return;
    const viewshed = new ViewshedAnalysis({
      viewPosition: cartesian,
      viewDistance: 1000,
      viewHeading: viewshedConfig[0].value,
      viewPitch: viewshedConfig[1].value,
      horizontalViewAngle: viewshedConfig[2].value,
      verticalViewAngle: viewshedConfig[3].value,
      visibleAreaColor: Color.GREEN,
      invisibleAreaColor: Color.RED,
    });
    viewshedList.push(viewshed);
  }, ScreenSpaceEventType.LEFT_CLICK);
}
function clearViewshedClick() {
  drawHandler.destroy();
  viewshedList.forEach((viewshed, i) => {
    viewshedList[i] = null;
    viewshed.clear();
  });
  viewshedList = [];
}
</script>

<style lang="scss" scoped></style>
