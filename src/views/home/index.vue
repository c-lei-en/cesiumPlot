<template>
  <el-container style="width: 100%; height: 100%">
    <el-aside width="aotu" style="height: 100%">
      <el-menu
        default-active="1-1"
        class="el-menu-vertical-demo"
        :collapse="true"
      >
        <el-sub-menu index="1">
          <template #title>
            <el-icon>
              <location />
            </el-icon>
            <span>地图展示</span>
          </template>
          <el-menu-item-group>
            <el-menu-item index="1-1" @click="isDraw = false"
              >地图</el-menu-item
            >
            <el-menu-item index="1-2" @click="isDraw = true">编辑</el-menu-item>
          </el-menu-item-group>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-main style="height: 100%; padding: 0">
      <RouterView />
    </el-main>
  </el-container>
  <transition
    leave-active-class="animate__animated animate__bounceInLeft"
    enter-active-class="animate__animated animate__bounceInRight"
  >
    <DrawTool :drawer="isDraw" @change-show="changeShow"></DrawTool>
  </transition>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { ref, defineComponent } from "vue";
import { Location } from "@element-plus/icons-vue";
import DrawTool from "@/views/map/tools/DrawTool.vue";

defineComponent({ DrawTool });
const isDraw = ref(false);
function changeShow(val: boolean) {
  isDraw.value = val;
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
