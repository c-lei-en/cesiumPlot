import { getCatesian3FromPX } from "@/views/map/plot/tools";
import {
  CallbackProperty,
  Cartesian3,
  Cesium3DTileset,
  Color,
  Entity,
  HeadingPitchRange,
  PolylineGraphics,
  Ray,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
} from "cesium";

export class VisibilityAnalysis {
  handler: any;
  planeLineEntityList: any[];
  pointList: any[];
  tileset: any;
  constructor() {
    this.planeLineEntityList = [];
    this.pointList = [];
    this.handler = new ScreenSpaceEventHandler(window.Viewer.scene.canvas);
    this.add3DTile(
      "http://localhost:8091/Cesium3DTiles/Tilesets/Tileset/tileset.json"
    );
  }

  // * 添加3DTile
  async add3DTile(url: string) {
    this.tileset = await Cesium3DTileset.fromUrl(url, {});

    window.Viewer.scene.primitives.add(this.tileset);
    window.Viewer.zoomTo(this.tileset, new HeadingPitchRange(0.0, -0.3, 0.0));
  }

  // * 创建中间线条entity以适应动态数据
  createLineEntity(isGround: boolean): Entity {
    const update = () => {
      return this.pointList;
    };
    return window.Viewer.entities.add({
      polyline: new PolylineGraphics({
        positions: new CallbackProperty(update, false),
        show: true,
        material: Color.BLUE,
        clampToGround: isGround,
      }),
    });
  }

  // * 绘制线
  drawLine(leftPoint: Cartesian3, secPoint: Cartesian3, color: Color) {
    const line = window.Viewer.entities.add({
      polyline: {
        positions: [leftPoint, secPoint],
        width: 1,
        material: color,
        depthFailMaterial: color,
      },
    });
    this.planeLineEntityList.push(line);
  }

  analysisVisible() {
    this.pointList = [];
    let lineEntity: null | Entity;
    // * 监测鼠标左击事件
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      const num = this.pointList.length;
      if (num == 1) {
        this.pointList.push(cartesian.clone());
      } else {
        this.pointList.push(cartesian.clone());
        window.Viewer.entities.remove(lineEntity);

        // 计算射线的方向
        const direction = Cartesian3.normalize(
          Cartesian3.subtract(
            this.pointList[1],
            this.pointList[0],
            new Cartesian3()
          ),
          new Cartesian3()
        );
        // 建立射线
        const ray = new Ray(this.pointList[0], direction);
        const result = window.Viewer.scene.globe.pick(ray, window.Viewer.scene); // 计算交互点，返回第一个

        if (result !== undefined && result !== null) {
          this.drawLine(result, this.pointList[0], Color.GREEN); // 可视区域
          this.drawLine(result, this.pointList[1], Color.RED); // 不可视区域
        } else {
          const tileResult = window.Viewer.scene.pickFromRay(ray);
          if (defined(tileResult) && defined(tileResult.object)) {
            this.drawLine(tileResult.position, this.pointList[0], Color.GREEN); // 可视区域
            this.drawLine(tileResult.position, this.pointList[1], Color.RED); // 不可视区域
          } else {
            this.drawLine(this.pointList[0], this.pointList[1], Color.GREEN);
          }
        }
        this.destoryHandler();
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // * 监测鼠标移动事件
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!defined(cartesian)) return;

      if (this.pointList.length == 2 && !lineEntity) {
        lineEntity = this.createLineEntity(false);
      }

      this.pointList.pop();
      this.pointList.push(cartesian);
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }

  //   * 清除销毁
  destoryHandler() {
    this.handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
    this.handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
    this.handler.removeInputAction(ScreenSpaceEventType.RIGHT_CLICK);
  }

  //   * 清除所有已绘制图形
  clearAll() {
    this.destoryHandler();
    this.planeLineEntityList.forEach((item) => {
      window.Viewer.entities.remove(item);
    });
    this.planeLineEntityList = [];
    this.pointList = [];
  }

  //   * 销毁实例
  destory() {
    this.clearAll();
    window.Viewer.scene.primitives.remove(this.tileset);
    this.handler.destroy();
    this.handler = undefined;
  }
}
