<template>
  <div v-if="isDrawer" class="drawTool">
    <el-tabs style="height: 100%" type="border-card">
      <el-tab-pane label="标绘工具">
        <el-space :fill="true" wrap>
          <el-switch
            v-model="isModified"
            inline-prompt
            style="
              --el-switch-on-color: #13ce66;
              --el-switch-off-color: #ff4949;
            "
            active-text="开始编辑"
            inactive-text="关闭编辑"
          ></el-switch>
          <el-card
            style="max-height: 150px; overflow: auto"
            v-for="item in cardArrays"
            :key="item.id"
          >
            <template #header>
              <div class="card-header">
                <span>{{ item.name }}</span>
              </div>
            </template>
            <el-space wrap>
              <el-button
                v-for="plot in item.children"
                :key="plot.activeName"
                @click="plotDraw(plot.activeName)"
                text
              >
                {{ plot.name }}
              </el-button>
            </el-space>
          </el-card>
        </el-space></el-tab-pane
      >
      <el-tab-pane label="样式修改">
        <input />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import PlotDraw from "../plot";

const cardArrays = [
  {
    name: "点标绘",
    id: 1,
    children: [
      {
        name: "点",
        activeName: "marker",
      },
    ],
  },
  {
    name: "线标绘",
    id: 2,
    children: [
      {
        name: "弧线",
        activeName: "arc",
      },
      {
        name: "曲线",
        activeName: "curve",
      },
      {
        name: "折线",
        activeName: "polyline",
      },
      {
        name: "自由线",
        activeName: "freeHandPolyline",
      },
    ],
  },
  {
    name: "面标绘",
    id: 3,
    children: [
      {
        name: "圆",
        activeName: "circle",
      },
      {
        name: "椭圆",
        activeName: "ellipse",
      },
      {
        name: "弓形",
        activeName: "lune",
      },
      {
        name: "扇形",
        activeName: "sector",
      },
      {
        name: "矩形",
        activeName: "rectangle",
      },
      {
        name: "曲线面",
        activeName: "closedCurve",
      },
      {
        name: "多边形",
        activeName: "polygon",
      },
      {
        name: "自由面",
        activeName: "freeHandPolygon",
      },
      {
        name: "聚集地",
        activeName: "gatheringPlace",
      },
    ],
  },
  {
    name: "箭头标绘",
    id: 4,
    children: [
      {
        name: "钳击",
        activeName: "doubleArrow",
      },
      {
        name: "直箭头",
        activeName: "straightArrow",
      },
      {
        name: "细直箭头",
        activeName: "fineArrow",
      },
      {
        name: "突击方向",
        activeName: "assaultDirection",
      },
      {
        name: "进攻方向",
        activeName: "attackArrow",
      },
      {
        name: "进攻方向（尾）",
        activeName: "tailedAttackArrow",
      },
      {
        name: "分队战斗行动",
        activeName: "squadCombat",
      },
      {
        name: "分队战斗行动（尾）",
        activeName: "tailedSquadCombat",
      },
    ],
  },
];

const props = defineProps({
  drawer: {
    type: Boolean,
    require: true,
  },
});
const emitter = defineEmits(["changeShow"]);
const isDrawer = computed({
  get: () => props.drawer,
  set: (val) => emitter("changeShow", val),
});

const isModified = ref(false);

let draw: PlotDraw;

onMounted(() => {
  draw = new PlotDraw();
});

watch(isModified, (newValue) => {
  if (newValue) {
    draw?.startModified();
  } else {
    draw?.endModify();
  }
});

function plotDraw(name: string) {
  console.log(name);
  draw?.draw(name);
}
</script>

<style lang="scss" scoped>
.drawTool {
  position: fixed;
  top: 20%;
  right: 0;
  z-index: 2000;
  height: 75%;
  width: 20%;
  background: #131e30;

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
