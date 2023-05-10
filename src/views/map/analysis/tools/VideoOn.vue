<!-- eslint-disable prettier/prettier -->
<template>
  <el-card style="overflow: auto">
    <el-input style="margin-top: 10px" v-model="videoUrl">
      <template #prepend> 视频地址 </template>
    </el-input>
    <el-button-group>
      <el-button type="primary" text :icon="Edit" @click="videoClick"
        >视频融合</el-button
      >
      <el-button type="primary" text :icon="Delete" @click="clearVideoClick"
        >清除</el-button
      >
    </el-button-group>
  </el-card>
  <video id="myVideo" muted="" autoplay="" loop="" crossorigin="" controls="">
    <source :src="videoUrl" type="video/webm" />
  </video>
</template>

<script lang="ts" setup>
import { Delete, Edit } from "@element-plus/icons-vue";
import { ref, onMounted } from "vue";
import emitter from "@/mitt";
import { Rectangle } from "../../plot/graphicsDraw/areaDraw";
import { VideoSynchronizer } from "cesium";

const videoUrl = ref(
  "http://localhost:8091/Videos/big-buck-bunny-trailer-small.webm"
);

var rect: Rectangle | null = new Rectangle();
let videoEntity;
function videoClick() {
  rect = new Rectangle();
  rect.startDraw();
  emitter.on("drawEnd", VideoOn);
}
function clearVideoClick() {
  window.Viewer.entities.remove(videoEntity);
  rect.disable();
  rect = null;
  videoEntity = null;
  emitter.off("drawEnd", VideoOn);
}
let videoElement;
onMounted(() => {
  videoElement = document.getElementById("myVideo");
  videoElement.style.display = "none";

  new VideoSynchronizer({
    clock: window.Viewer.clock,
    element: videoElement,
  });
});
function VideoOn() {
  setTimeout(() => {
    videoEntity = window.Viewer.entities.add({
      rectangle: {
        coordinates: rect.areaPrimitive.geometryInstances.geometry.rectangle,
        material: videoElement,
      },
    });
    if (rect.areaPrimitive) {
      window.Viewer.scene.groundPrimitives.remove(rect.areaPrimitive);
    }
    window.Viewer.clock.shouldAnimate = true;
  }, 300);
}
</script>

<style lang="scss" scoped></style>
