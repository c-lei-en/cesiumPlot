<template>
  <el-card style="margin-top: 10px; overflow: auto">
    <el-input
      style="margin-top: 10px"
      v-for="(item, index) in lineConfig"
      :key="index"
      v-model="item.value"
      :oninput="item.oninput"
    >
      <template #prepend>
        {{ item.name }}
      </template>
    </el-input>
    <el-button
      type="primary"
      style="margin-top: 5px; margin-left: 80%"
      @click="lineMaterialClick"
      >确定</el-button
    >
  </el-card>
</template>

<script lang="ts" setup>
import { Color, Material } from "cesium";
import { reactive, toRaw } from "vue";
import PlotDraw from "../plot";
import type { BaseLineI } from "../plot/interface";

const props = defineProps({
  draw: {
    type: PlotDraw,
    required: true,
  },
});
let line = toRaw(props.draw.nowObj as BaseLineI);

// 线样式修改相关配置
const lineConfig = reactive([
  {
    name: "宽度",
    value: 2,
    oninput: "value=value.replace(/[^0-9.]/g,'')",
  },
  {
    name: "速度",
    value: 2,
    oninput: "value=value.replace(/[^0-9.]/g,'')",
  },
  {
    name: "颜色",
    value: "#ffff00",
    oninput: "value=value.replace(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/g,'')",
  },
]);

function lineMaterialClick() {
  console.log(line.linePrimitive);
  line.linePrimitive._primitiveOptions.geometryInstances[0].geometry.width =
    eval(lineConfig[0].value as string);
  const polylineFabric = {
    type: "PolylineFabric",
    uniforms: {
      color: Color.fromCssColorString(lineConfig[2].value as string),
      speed: eval(lineConfig[1].value as string),
    },
    source: `czm_material czm_getMaterial(czm_materialInput materialInput) {
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st = materialInput.st;
        float xx = fract(st.s * speed - czm_frameNumber/60.0);
        float r = xx;
        float g = sin(czm_frameNumber / 30.0);
        float b = cos(czm_frameNumber / 30.0);
        vec3 fragColor;
        fragColor.rgb = color.rgb / 1.0;
        fragColor = czm_gammaCorrect(fragColor); // 伽马校正
        material.alpha = xx;
        material.diffuse = vec3(r,g,b) / 2.0;
        material.emission = fragColor.rgb;
        return material;
        }`,
  };
  line.linePrimitive.appearance.material = new Material({
    fabric: polylineFabric,
  });
}
</script>

<style lang="scss" scoped></style>
