import { getCatesian3FromPX } from "@/views/map/plot/tools";
import {
  CallbackProperty,
  Cartesian3,
  ClippingPlane,
  ClippingPlaneCollection,
  Color,
  CornerType,
  HeightReference,
  Plane,
  PolygonHierarchy,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from "cesium";

export class TerrainCutting {
  //裁剪区域数组
  clippingPlanesArray: Array<any>;
  //多边形对象
  temporayrPolygonEntity: any;
  //挖掘墙体
  clippingWallEntities: any;
  //挖掘墙体底部区域
  clippingBootomWallEntities: any;
  //点位
  clippingPoint: Array<any>;
  //鼠标对象
  cesiumEvent: any;
  //鼠标按压状态
  cesiumEventState: string;
  //当前点击的覆盖物
  activeClickPick: any;
  //信息窗体Dom
  infoWindowElement: any;
  //定义挖掘深度
  clippingDeepValue: number;
  //窗口更新事件
  preRenderEvent: any;

  constructor() {
    //注册区域挖掘
    this.clippingPlanesArray = [];
    this.clippingPoint = [];
    this.temporayrPolygonEntity = null;
    this.clippingWallEntities = null;
    this.clippingBootomWallEntities = null;
    this.activeClickPick = null;
    this.infoWindowElement = null;
    this.preRenderEvent = null;
    this.clippingDeepValue = 20;
    this.cesiumEventState = "";
  }
  create(deep: number) {
    this.clippingDeepValue = deep;
    //开始之前清除数据
    this.cesiumEvent = new ScreenSpaceEventHandler(window.Viewer.scene.canvas);
    this.cesiumEvent.setInputAction((event: any) => {
      //更新鼠标状态
      this.cesiumEventState = "leftClick";
      //当前点击覆盖物
      this.activeClickPick = window.Viewer.scene.pick(event.position);
      //点击空白区域重新绘制
      if (!this.activeClickPick || !this.activeClickPick.id) {
        //恢复地形开挖状态
        if (this.clippingWallEntities) {
          this.destroy();
        }

        //绘制地形开挖边界
        this.saveClippingPlaneCollectionData(event);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    //鼠标按下事件
    this.cesiumEvent.setInputAction((event: any) => {
      //更新鼠标状态
      this.cesiumEventState = "leftDown";
      //当前点击覆盖物
      this.activeClickPick = window.Viewer.scene.pick(event.position);
      if (this.clippingWallEntities) {
        if (this.activeClickPick && this.activeClickPick.id) {
          //选中点击位置
          this.selectClickPoint();
        }
      }
    }, ScreenSpaceEventType.LEFT_DOWN);

    //鼠标抬起事件
    this.cesiumEvent.setInputAction(() => {
      //更新鼠标状态
      this.cesiumEventState = "leftUp";
    }, ScreenSpaceEventType.LEFT_UP);

    //鼠标移动事件
    this.cesiumEvent.setInputAction((event: any) => {
      if (this.activeClickPick && this.activeClickPick.id) {
        //判断鼠标是否为按压状态
        if (this.cesiumEventState == "leftDown") {
          this.changeLayerPointPostion(event);
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    this.cesiumEvent.setInputAction(() => {
      //更新鼠标状态
      this.cesiumEventState = "rightClick";

      this.clippingPlaneCollection();
    }, ScreenSpaceEventType.RIGHT_CLICK);
  }

  //保存区域挖掘数据
  saveClippingPlaneCollectionData(event: any) {
    const cartesian = getCatesian3FromPX(event.position);
    this.clippingPlanesArray.push(cartesian);

    //绘制点
    const clippingPoint = window.Viewer.entities.add({
      name: "定位点",
      position: cartesian,
      point: {
        color: Color.SKYBLUE,
        pixelSize: 10,
        outlineColor: Color.YELLOW,
        outlineWidth: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    });
    this.clippingPoint.push(clippingPoint);
    //绘制开挖区域
    if (!this.temporayrPolygonEntity) {
      this.temporayrPolygonEntity = window.Viewer.entities.add({
        polygon: {
          hierarchy: new CallbackProperty(() => {
            return new PolygonHierarchy(this.clippingPlanesArray);
          }, false),
          heightReference: HeightReference.CLAMP_TO_GROUND,
          material: Color.RED.withAlpha(0.0),
        },
      });
    }
  }

  //开始挖掘
  clippingPlaneCollection() {
    //开始挖掘之前移除已经挖掘过的区域
    if (this.clippingWallEntities) {
      window.Viewer.entities.remove(this.clippingWallEntities);
      this.clippingWallEntities = null;
    }

    if (this.clippingBootomWallEntities) {
      window.Viewer.entities.remove(this.clippingBootomWallEntities);
      this.clippingBootomWallEntities = null;
    }

    window.Viewer.scene.globe.clippingPlanes = new ClippingPlaneCollection({
      planes: [],
      edgeWidth: 0,
    });

    const points = this.clippingPlanesArray;

    const pointsLength = points.length;
    const clippingPlanes = [];
    for (let i = 0; i < pointsLength; ++i) {
      const nextIndex = (i + 1) % pointsLength;

      let midpoint = Cartesian3.add(
        points[i],
        points[nextIndex],
        new Cartesian3()
      );
      midpoint = Cartesian3.multiplyByScalar(midpoint, 0.5, midpoint);

      const up = Cartesian3.normalize(midpoint, new Cartesian3());
      let right = Cartesian3.subtract(
        points[nextIndex],
        midpoint,
        new Cartesian3()
      );
      right = Cartesian3.normalize(right, right);

      let normal = Cartesian3.cross(right, up, new Cartesian3());
      normal = Cartesian3.normalize(normal, normal);

      const originCenteredPlane = new Plane(normal, 0.0);
      const distance = Plane.getPointDistance(originCenteredPlane, midpoint);

      clippingPlanes.push(new ClippingPlane(normal, distance));
    }

    window.Viewer.scene.globe.clippingPlanes = new ClippingPlaneCollection({
      planes: clippingPlanes,
      edgeWidth: 1,
    });

    // 侧边墙体
    this.clippingWallEntities = window.Viewer.entities.add({
      corridor: {
        positions: [
          ...this.clippingPlanesArray,
          this.clippingPlanesArray[0],
          this.clippingPlanesArray[1],
        ],
        height: this.clippingDeepValue * -100,
        heightReference: HeightReference.RELATIVE_TO_GROUND,
        extrudedHeight: 0,
        extrudedHeightReference: HeightReference.RELATIVE_TO_GROUND,
        width: 1,
        material: Color.fromCssColorString(`rgba(66,187,133,1)`),
        cornerType: CornerType.MITERED,
        outline: false,
      },
    });
    //底部墙体
    this.clippingBootomWallEntities = window.Viewer.entities.add({
      polygon: {
        hierarchy: this.clippingPlanesArray,
        heightReference: HeightReference.RELATIVE_TO_GROUND,
        height: this.clippingDeepValue * -1,
        extrudedHeightReference: HeightReference.RELATIVE_TO_GROUND,
        extrudedHeight: this.clippingDeepValue * -1 + 1,
        material: Color.YELLOW,
      },
    });
  }

  //修改定位点选中状态
  selectClickPoint() {
    if (this.activeClickPick.id.name == "定位点") {
      for (let i = 0; i < this.clippingPoint.length; i++) {
        this.clippingPoint[i].point.color = Color.SKYBLUE;
      }
      this.activeClickPick.id.point.color = Color.RED;
    }
  }

  //修改选中点的位置，更新矩形边框位置
  changeLayerPointPostion(event: any) {
    const cartesian = window.Viewer.camera.pickEllipsoid(
      event.endPosition,
      window.Viewer.scene.globe.ellipsoid
    );
    this.activeClickPick.id.position = cartesian;
    //根据ID得到修改的index
    let activeIndex = -1;
    for (let i = 0; i < this.clippingPoint.length; i++) {
      if (this.activeClickPick.id._id == this.clippingPoint[i]._id) {
        activeIndex = i;
      }
    }
    this.clippingPlanesArray[activeIndex] = cartesian;
    //修改挖掘区域
    if (this.clippingWallEntities) {
      this.clippingPlaneCollection();
    }
  }

  //停止挖掘
  stop() {
    if (this.cesiumEvent) {
      this.cesiumEvent.destroy();
    }
    if (this.temporayrPolygonEntity) {
      window.Viewer.entities.remove(this.temporayrPolygonEntity);
      this.clippingPlanesArray = [];
      this.temporayrPolygonEntity = null;
    }
    if (this.clippingWallEntities) {
      window.Viewer.entities.remove(this.clippingWallEntities);
      this.clippingWallEntities = null;
    }
    if (this.clippingBootomWallEntities) {
      window.Viewer.entities.remove(this.clippingBootomWallEntities);
      this.clippingBootomWallEntities = null;
    }
    if (this.clippingPoint.length > 0) {
      for (let i = 0; i < this.clippingPoint.length; i++) {
        window.Viewer.entities.remove(this.clippingPoint[i]);
      }
      this.clippingPoint = [];
    }
    window.Viewer.scene.globe.clippingPlanes = new ClippingPlaneCollection({
      planes: [],
      edgeWidth: 0,
    });
    if (this.infoWindowElement) {
      (document.getElementById("cesiumContainer") as HTMLElement).removeChild(
        this.infoWindowElement
      );
      this.infoWindowElement = null;
      this.preRenderEvent();
    }
  }

  //销毁整个工具类
  destroy() {
    if (this.temporayrPolygonEntity) {
      window.Viewer.entities.remove(this.temporayrPolygonEntity);
      this.clippingPlanesArray = [];
      this.temporayrPolygonEntity = null;
    }
    if (this.clippingWallEntities) {
      window.Viewer.entities.remove(this.clippingWallEntities);
      this.clippingWallEntities = null;
    }
    if (this.clippingBootomWallEntities) {
      window.Viewer.entities.remove(this.clippingBootomWallEntities);
      this.clippingBootomWallEntities = null;
    }
    if (this.clippingPoint.length > 0) {
      for (let i = 0; i < this.clippingPoint.length; i++) {
        window.Viewer.entities.remove(this.clippingPoint[i]);
      }
      this.clippingPoint = [];
    }

    window.Viewer.scene.globe.clippingPlanes = new ClippingPlaneCollection({
      planes: [],
      edgeWidth: 0,
    });

    if (this.infoWindowElement) {
      (document.getElementById("cesiumContainer") as HTMLElement).removeChild(
        this.infoWindowElement
      );
      this.infoWindowElement = null;
      this.preRenderEvent();
    }
  }
}
