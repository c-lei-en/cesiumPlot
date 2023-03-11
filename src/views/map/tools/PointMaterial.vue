<template>
  <el-card style="margin-top: 10px; overflow: auto">
    <el-input
      v-model="pointModel.modelUrl"
      placeholder="请输入相应模型/图片地址"
    >
      <template #prepend>
        <el-select v-model="pointModel.modelName" style="width: 80px">
          <el-option label="模型" value="model" />
          <el-option label="图片" value="iamge" />
        </el-select>
      </template>
    </el-input>
    <el-button type="primary" style="margin-top: 5px; margin-left: 80%"
      >确定</el-button
    >
  </el-card>
  <el-card style="margin-top: 10px; overflow: auto; max-height: 500px">
    <template #header>
      <div class="card-header">
        <span>粒子系统</span>
      </div>
    </template>
    <el-select
      v-model="pointParticle.particleType"
      placeholder="Select"
      style="width: 100%"
    >
      <el-option label="盒发射器" value="BoxEmitter" />
      <el-option label="圆形发射器" value="CircleEmitter" />
      <el-option label="圆锥发射器" value="ConeEmitter" />
      <el-option label="球发射器" value="SphereEmitter" />
    </el-select>
    <el-input
      style="margin-top: 10px"
      v-for="(item, index) in pointParticle.particleInput"
      :key="index"
      v-model="item.value"
      :placeholder="item.title"
      :oninput="item.oninput"
    >
      <template #prepend>
        {{ item.name }}
      </template>
    </el-input>
    <el-button type="primary" style="margin-top: 5px; margin-left: 80%"
      >确定</el-button
    >
  </el-card>
</template>

<script lang="ts" setup>
import { reactive } from "vue";

let pointModel = reactive({
  modelUrl: "",
  modelName: "model",
});

let pointParticle = reactive({
  particleType: "BoxEmitter",
  particleInput: [
    {
      value: 1.0,
      name: "初始比例",
      realName: "startScale",
      title: "请输入粒子初始时比例",
      oninput: "value=value.replace(/[^0-9.]/g,'')",
    },
    {
      value: 5.0,
      name: "消失比例",
      realName: "endScale",
      title: "请输入粒子消失时比例",
      oninput: "value=value.replace(/[^0-9.]/g,'')",
    },
    {
      value: "#ffff00",
      name: "粒子颜色",
      realName: "startColor",
      title: "请输入粒子初始时颜色",
      oninput: "value=value.replace(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/g,'')",
    },
    {
      value: "/src/assets/icon/smoke.png",
      name: "图片地址",
      realName: "image",
      title: "请输入粒子对应图片地址",
      oninput: "value=value.replace(/*/g,'')",
    },
    {
      value: 1.0,
      name: "图片尺寸",
      realName: "image",
      title: "请输入粒子对应图片尺寸",
      oninput: "value=value.replace(/[^0-9.]/g,'')",
    },
    {
      value: 1.0,
      name: "最小速度",
      realName: "minimumSpeed",
      title: "请输入粒子最小速度",
      oninput: "value=value.replace(/[^0-9.]/g,'')",
    },
    {
      value: 1.0,
      name: "最大速度",
      realName: "maximumSpeed",
      title: "请输入粒子最大速度",
      oninput: "value=value.replace(/[^0-9.]/g,'')",
    },
    {
      value: 5.0,
      name: "每秒粒子数",
      realName: "emissionRate",
      title: "请输入每秒发射的粒子数",
      oninput: "value=value.replace(/[^0-9.]/g,'')",
    },
    {
      value: 1.0,
      name: "最小存活时间",
      realName: "minimumParticleLife",
      title: "请输入粒子最小存活时间",
      oninput: "value=value.replace(/[^0-9.]/g,'')",
    },
    {
      value: 1.0,
      name: "最大存活时间",
      realName: "maximumParticleLife",
      title: "请输入粒子最大存活时间",
      oninput: "value=value.replace(/[^0-9.]/g,'')",
    },
  ],
});
</script>

<style lang="scss" scoped></style>
