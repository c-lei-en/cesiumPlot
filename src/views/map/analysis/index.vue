<template>
  <div class="analysisTool">
    <MeasureTool v-if="props.analysisType == '测量工具'" />
    <FloodTool v-else-if="props.analysisType == '淹没分析'" />
    <VideoOn v-else-if="props.analysisType == '视频融合'" />
    <ViewshedTool v-else-if="props.analysisType == '可视域分析'" />
    <VisibilityTool v-else-if="props.analysisType == '透视分析'" />
  </div>
</template>

<script lang="ts" setup>
import { defineComponent } from "vue";
import MeasureTool from "./tools/MeasureTool.vue";
import FloodTool from "./tools/FloodTool.vue";
import VideoOn from "./tools/VideoOn.vue";
import ViewshedTool from "./tools/ViewshedTool.vue";
import VisibilityTool from "./tools/VisibilityTool.vue";

defineComponent({
  MeasureTool,
  FloodTool,
  VideoOn,
  ViewshedTool,
  VisibilityTool,
});

const props = defineProps({
  analysisType: {
    type: String,
    required: true,
  },
});
</script>

<style lang="scss" scoped>
.analysisTool {
  position: fixed;
  top: 20%;
  right: 0;
  z-index: 2000;
  height: auto;
  width: 20%;
  background: #1d1e1f;

  ::-webkit-scrollbar {
    /*滚动条整体样式*/
    width: 2px; /*高宽分别对应横竖滚动条的尺寸*/
    height: 1px;
  }
  ::-webkit-scrollbar-thumb {
    /*滚动条里面小方块*/
    border-radius: 10px;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
    background: #535353;
  }
  ::-webkit-scrollbar-track {
    /*滚动条里面轨道*/
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    background: #ededed;
  }
}
</style>
