<template>
  <el-card style="margin-top: 10px; overflow: auto">
    <el-input
      v-model="pointModel.modelUrl"
      placeholder="请输入相应模型/图片地址"
    >
      <template #prepend>
        <el-select v-model="pointModel.modelName" style="width: 80px">
          <el-option label="模型" value="model" />
          <el-option label="图片" value="image" />
        </el-select>
      </template>
    </el-input>
    <el-button
      type="primary"
      style="margin-top: 5px; margin-left: 80%"
      @click="modelClick"
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
      @change="particleChange"
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
    <el-button
      type="primary"
      @click="particleClick"
      style="margin-top: 5px; margin-left: 80%"
      >确定</el-button
    >
  </el-card>
</template>

<script lang="ts" setup>
import {
  Billboard,
  BoxEmitter,
  Cartesian2,
  Cartesian3,
  CircleEmitter,
  Color,
  ConeEmitter,
  HeadingPitchRoll,
  Matrix4,
  Model,
  ParticleSystem,
  SphereEmitter,
  Transforms,
  Math as cesiumMath,
} from "cesium";
import { reactive } from "vue";
import PlotDraw from "../plot";
import type { Marker } from "../plot/graphicsDraw/pointDraw";

const props = defineProps({
  draw: {
    type: PlotDraw,
    required: true,
  },
});

let point = props.draw.nowObj as Marker;

// /src/assets/models/CesiumAir/Cesium_Air.gltf
let pointModel = reactive({
  modelUrl: "",
  modelName: "image",
});
function modelClick() {
  if (pointModel.modelName == "image") {
    if (point.pointPrimitive instanceof Billboard) {
      point.pointPrimitive.image = pointModel.modelUrl;
    } else {
      const position = Matrix4.getTranslation(
        point.pointPrimitive.modelMatrix,
        new Cartesian3()
      );
      window.Viewer.scene.primitives.remove(point.pointPrimitive);
      point.pointPrimitive = point.showPrimitiveOnMap(position);
    }
  } else {
    if (
      point.pointPrimitive instanceof Model ||
      point.pointPrimitive instanceof ParticleSystem
    ) {
      window.Viewer.scene.primitives.remove(point.pointPrimitive);
      point.pointPrimitive = point.showPrimitiveModelOnMap(
        pointModel.modelUrl,
        point.pointPrimitive.modelMatrix
      );
    } else {
      const position = point.pointPrimitive.position;
      const modelMatrix = Transforms.headingPitchRollToFixedFrame(
        position,
        new HeadingPitchRoll(0, 0, 0)
      );
      window.Viewer.billboards.remove(point.pointPrimitive);
      point.pointPrimitive = point.showPrimitiveModelOnMap(
        pointModel.modelUrl,
        modelMatrix
      );
    }
  }
}

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
      value: 3.0,
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
      value: 3.0,
      name: "最大速度",
      realName: "maximumSpeed",
      title: "请输入粒子最大速度",
      oninput: "value=value.replace(/[^0-9.]/g,'')",
    },
    {
      value: 10.0,
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
      value: 5.0,
      name: "最大存活时间",
      realName: "maximumParticleLife",
      title: "请输入粒子最大存活时间",
      oninput: "value=value.replace(/[^0-9.]/g,'')",
    },
  ],
});
function particleClick() {
  let emitterParticle;
  switch (pointParticle.particleType) {
    case "BoxEmitter":
      emitterParticle = new BoxEmitter(new Cartesian3(10.0, 10.0, 10.0));
      break;
    case "CircleEmitter":
      emitterParticle = new CircleEmitter(2.0);
      break;
    case "ConeEmitter":
      emitterParticle = new ConeEmitter(cesiumMath.toRadians(45.0));
      break;
    case "SphereEmitter":
      emitterParticle = new SphereEmitter(2.5);
      break;
    default:
      emitterParticle = new CircleEmitter(2.0);
      break;
  }
  let modelMatrix;
  if (point.pointPrimitive instanceof Billboard) {
    modelMatrix = Transforms.headingPitchRollToFixedFrame(
      point.pointPrimitive.position,
      new HeadingPitchRoll(0, 0, 0)
    );
    window.Viewer.billboards.remove(point.pointPrimitive);
  } else if (point.pointPrimitive instanceof Model) {
    modelMatrix = point.pointPrimitive.modelMatrix;
    window.Viewer.scene.primitives.remove(point.pointPrimitive);
  } else {
    modelMatrix = point.pointPrimitive.modelMatrix;
  }
  const gravityScratch = new Cartesian3();

  if (!(point.pointPrimitive instanceof ParticleSystem)) {
    point.pointPrimitive = window.Viewer.scene.primitives.add(
      new ParticleSystem({
        lifetime: 16.0,
        updateCallback: function (p) {
          const position = p.position;

          Cartesian3.normalize(position, gravityScratch);
          Cartesian3.multiplyByScalar(gravityScratch, 0, gravityScratch);

          p.velocity = Cartesian3.add(p.velocity, gravityScratch, p.velocity);
        },
        emitterModelMatrix: modelMatrix,
      })
    );
  }
  point.pointPrimitive.emitter = emitterParticle;
  point.pointPrimitive.image = pointParticle.particleInput[3].value;
  point.pointPrimitive.startColor = Color.fromCssColorString(
    pointParticle.particleInput[2].value as string
  ).withAlpha(0.7);
  point.pointPrimitive.endColor = Color.WHITE.withAlpha(0.0);
  point.pointPrimitive.startScale = eval(
    pointParticle.particleInput[0].value as string
  ) as number;
  point.pointPrimitive.endScale = eval(
    pointParticle.particleInput[1].value as string
  ) as number;
  point.pointPrimitive.minimumParticleLife = eval(
    pointParticle.particleInput[8].value as string
  ) as number;
  point.pointPrimitive.maximumParticleLife = eval(
    pointParticle.particleInput[9].value as string
  ) as number;
  point.pointPrimitive.minimumSpeed = eval(
    pointParticle.particleInput[5].value as string
  ) as number;
  point.pointPrimitive.maximumSpeed = eval(
    pointParticle.particleInput[6].value as string
  ) as number;
  point.pointPrimitive.imageSize = new Cartesian2(
    eval(pointParticle.particleInput[4].value as string) as number,
    eval(pointParticle.particleInput[4].value as string) as number
  );
  point.pointPrimitive.emissionRate = eval(
    pointParticle.particleInput[7].value as string
  ) as number;
}

function particleChange(val: string) {
  console.log(val);

  if (point.pointPrimitive instanceof ParticleSystem) {
    switch (val) {
      case "BoxEmitter":
        point.pointPrimitive.emitter = new BoxEmitter(
          new Cartesian3(10.0, 10.0, 10.0)
        );
        break;
      case "CircleEmitter":
        point.pointPrimitive.emitter = new CircleEmitter(2.0);
        break;
      case "ConeEmitter":
        point.pointPrimitive.emitter = new ConeEmitter(
          cesiumMath.toRadians(45.0)
        );
        break;
      case "SphereEmitter":
        point.pointPrimitive.emitter = new SphereEmitter(2.5);
        break;
      default:
        point.pointPrimitive.emitter = new CircleEmitter(2.0);
        break;
    }
  }
}
</script>

<style lang="scss" scoped></style>
