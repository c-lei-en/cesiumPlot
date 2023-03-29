<template>
  <el-container style="width: 100%; height: 100%">
    <el-aside width="aotu" style="height: 100%">
      <el-menu
        default-active="1-1"
        class="el-menu-vertical-demo"
        :collapse="false"
        :unique-opened="true"
      >
        <el-sub-menu index="1">
          <template #title>
            <el-icon>
              <location />
            </el-icon>
            <span>地图展示</span>
          </template>
          <el-menu-item-group>
            <el-menu-item index="1-1" @click="displayClick('地图')"
              >地图</el-menu-item
            >
            <el-menu-item index="1-2" @click="displayClick('编辑')"
              >编辑</el-menu-item
            >
          </el-menu-item-group>
        </el-sub-menu>
        <el-sub-menu index="2">
          <template #title>
            <el-icon>
              <DataAnalysis />
            </el-icon>
            <span>空间分析</span>
          </template>
          <el-menu-item-group>
            <el-menu-item index="2-1" @click="analyzeClick('测量工具')"
              >测量工具</el-menu-item
            >
            <el-menu-item index="2-2" @click="analyzeClick('透视分析')"
              >透视分析</el-menu-item
            >
            <el-menu-item index="2-3" @click="analyzeClick('淹没分析')"
              >淹没分析</el-menu-item
            >
            <el-menu-item index="2-4" @click="analyzeClick('可视域分析')"
              >可视域分析</el-menu-item
            >
            <el-menu-item index="2-4" @click="analyzeClick('视频融合')"
              >视频融合</el-menu-item
            >
          </el-menu-item-group>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-main style="height: 100%; padding: 0">
      <RouterView />
    </el-main>
  </el-container>
  <transition enter-active-class="animate__animated animate__bounceInRight">
    <DrawTool v-if="isDraw"></DrawTool>
  </transition>
  <transition enter-active-class="animate__animated animate__bounceInRight">
    <AnalysisTool :analysisType="analysisType" v-if="isAnalyze"></AnalysisTool>
  </transition>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { ref, defineComponent } from "vue";
import { Location, DataAnalysis } from "@element-plus/icons-vue";
import DrawTool from "@/views/map/tools/DrawTool.vue";
import AnalysisTool from "@/views/map/analysis/index.vue";

defineComponent({ DrawTool, AnalysisTool });

const isDraw = ref(false);
function displayClick(type: string) {
  isAnalyze.value = false;
  if (type == "编辑") {
    isDraw.value = true;
  } else {
    isDraw.value = false;
  }
}

// * 空间分析工具
const analysisType = ref("测量工具");
const isAnalyze = ref(false);
function analyzeClick(type: string) {
  isDraw.value = false;
  isAnalyze.value = true;
  analysisType.value = type;
}
</script>

<style scoped>
.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
}
.el-menu-vertical-demo {
  height: 100%;
}
</style>
