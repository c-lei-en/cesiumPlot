import {
  CallbackProperty,
  Cartesian3,
  Color,
  defined,
  Ellipsoid,
  Entity,
  HeightReference,
  PolygonHierarchy,
  PolylineGraphics,
  Property,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Math as cesiumMath,
  EllipsoidGeodesic,
  sampleTerrainMostDetailed,
  createWorldTerrain,
  Cartographic,
} from "cesium";
import { GlobeTooltip } from "./globeTooltip";
import { getCatesian3FromPX } from "@/views/map/plot/tools";
import { infoBox } from "./infoBox";
import * as turf from "@turf/turf";

export default class MeasurementCalc {
  planeLengthEntityList: any[];
  planeLengthDivList: any[];
  planeLengthListenList: any[];
  planeAreaEntityList: any[];
  planeAreaDivList: any[];
  planeAreaListenList: any[];
  groundLengthEntityList: any[];
  groundLengthDivList: any[];
  groundLengthListenList: any[];
  groundAreaEntityList: any[];
  groundAreaDivList: any[];
  groundAreaListenList: any[];
  pointList: any[];
  handler: any;
  constructor() {
    this.planeLengthListenList = [];
    this.planeLengthDivList = [];
    this.planeLengthEntityList = [];
    this.planeAreaEntityList = [];
    this.planeAreaDivList = [];
    this.planeAreaListenList = [];
    this.groundLengthListenList = [];
    this.groundLengthDivList = [];
    this.groundLengthEntityList = [];
    this.groundAreaEntityList = [];
    this.groundAreaDivList = [];
    this.groundAreaListenList = [];
    this.pointList = [];
    this.handler = new ScreenSpaceEventHandler(window.Viewer.scene.canvas);
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

  // * 创建中间多边形entity以适应动态数据
  createAreaEntity(isGround: boolean): Entity {
    const update = () => {
      return new PolygonHierarchy(this.pointList);
    };
    return window.Viewer.entities.add({
      polygon: {
        hierarchy: new CallbackProperty(update, false),
        material: Color.BLUE,
        heightReference: isGround
          ? HeightReference.CLAMP_TO_GROUND
          : HeightReference.NONE,
      },
    });
  }

  //   * 获取平面长度
  getPlaneLength() {
    this.pointList = [];
    let lineEntity: null | Entity;
    const tooltip = new GlobeTooltip(window.Viewer.container);
    tooltip.setVisible(false);
    // * 监测鼠标左击事件
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
    }, ScreenSpaceEventType.LEFT_CLICK);

    // * 监测鼠标移动事件
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!defined(cartesian)) return;

      const position = evt.endPosition;
      if (this.pointList.length < 1) {
        tooltip.showAt(position, "<p>选择起点</p>");
        return;
      }

      if (this.pointList.length == 2 && !lineEntity) {
        lineEntity = this.createLineEntity(false);
        this.planeLengthEntityList.push(lineEntity);
      }

      const num = this.pointList.length;
      let tip = "<p>点击添加下一个点</p>";
      if (num > 2) {
        tip += "<p>点击鼠标右键结束绘制</p>";
      }
      tooltip.showAt(position, tip);

      this.pointList.pop();
      this.pointList.push(cartesian);
    }, ScreenSpaceEventType.MOUSE_MOVE);
    // * 监测鼠标右击事件
    this.handler.setInputAction(() => {
      if (this.pointList.length < 3) return;
      let total = 0;
      for (let i = 1; i < this.pointList.length; i++) {
        const p1 = this.pointList[i - 1];
        const p2 = this.pointList[i];
        const dis = Cartesian3.distance(p1, p2) / 1000;
        total += dis;
      }
      lineEntity &&
        lineEntity.polyline &&
        (lineEntity.polyline.positions = this.pointList as unknown as Property);
      const { infoDiv, listenerEvt } = infoBox(
        window.Viewer.container,
        this.pointList[this.pointList.length - 1],
        total.toFixed(2) + "km"
      );
      this.planeLengthDivList.push(infoDiv);
      this.planeLengthListenList.push(listenerEvt);
      tooltip.destory();
      this.destoryMeasure();
    }, ScreenSpaceEventType.RIGHT_CLICK);
  }

  //   * 获取平面面积
  getPlaneArea() {
    this.pointList = [];
    let areaEntity: null | Entity;
    const tooltip = new GlobeTooltip(window.Viewer.container);
    tooltip.setVisible(false);
    // * 监测鼠标左击事件
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
    }, ScreenSpaceEventType.LEFT_CLICK);

    // * 监测鼠标移动事件
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!defined(cartesian)) return;

      const position = evt.endPosition;
      if (this.pointList.length < 1) {
        tooltip.showAt(position, "<p>选择起点</p>");
        return;
      }
      if (this.pointList.length == 1) this.pointList.push(cartesian.clone());
      // * 若点击了一次就创建entity使用callback进行数据更新
      if (this.pointList.length == 2 && !areaEntity) {
        areaEntity = this.createAreaEntity(false);
        this.planeAreaEntityList.push(areaEntity);
      } else {
        // * 当鼠标移动时，修改最后一个值
        if (this.pointList.length >= 2)
          this.pointList.splice(
            this.pointList.length - 1,
            1,
            cartesian.clone()
          );
      }

      const num = this.pointList.length;
      let tip = "<p>点击添加下一个点</p>";
      if (num > 3) {
        tip += "<p>点击鼠标右键结束绘制</p>";
      }
      tooltip.showAt(position, tip);
    }, ScreenSpaceEventType.MOUSE_MOVE);
    // * 监测鼠标右击事件
    this.handler.setInputAction(() => {
      if (this.pointList.length < 3) return;
      const elliposid = Ellipsoid.WGS84,
        lonLatArray = [];
      for (const item of this.pointList) {
        const cartographic = elliposid.cartesianToCartographic(item);
        lonLatArray.push([
          cesiumMath.toDegrees(cartographic.longitude),
          cesiumMath.toDegrees(cartographic.latitude),
        ]);
      }
      lonLatArray.push(lonLatArray[0]);
      const polygonGeoJson = turf.polygon([lonLatArray]);
      const total = turf.area(polygonGeoJson);
      areaEntity &&
        areaEntity.polygon &&
        (areaEntity.polygon.hierarchy = new PolygonHierarchy(
          this.pointList
        ) as unknown as Property);
      const { infoDiv, listenerEvt } = infoBox(
        window.Viewer.container,
        this.pointList[this.pointList.length - 1],
        total.toFixed(2) + "km²"
      );
      this.planeAreaDivList.push(infoDiv);
      this.planeAreaListenList.push(listenerEvt);
      tooltip.destory();
      this.destoryMeasure();
    }, ScreenSpaceEventType.RIGHT_CLICK);
  }

  //   * 获取贴地长度
  getGroundLength() {
    this.pointList = [];
    let lineEntity: null | Entity;
    const tooltip = new GlobeTooltip(window.Viewer.container);
    tooltip.setVisible(false);
    // * 监测鼠标左击事件
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
    }, ScreenSpaceEventType.LEFT_CLICK);

    // * 监测鼠标移动事件
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!defined(cartesian)) return;

      const position = evt.endPosition;
      if (this.pointList.length < 1) {
        tooltip.showAt(position, "<p>选择起点</p>");
        return;
      }

      if (this.pointList.length == 2 && !lineEntity) {
        lineEntity = this.createLineEntity(true);
        this.groundLengthEntityList.push(lineEntity);
      }

      const num = this.pointList.length;
      let tip = "<p>点击添加下一个点</p>";
      if (num > 2) {
        tip += "<p>点击鼠标右键结束绘制</p>";
      }
      tooltip.showAt(position, tip);

      this.pointList.pop();
      this.pointList.push(cartesian);
    }, ScreenSpaceEventType.MOUSE_MOVE);
    // * 监测鼠标右击事件
    this.handler.setInputAction(() => {
      if (this.pointList.length < 3) return;

      // * 进行插值
      const pnts = [].concat(...this.pointList);
      const num = pnts.length;
      const tempPositions = [];
      for (let i = 1; i < num; i++) {
        const p1 = pnts[i - 1];
        const p2 = pnts[i];
        const ellipsoid = window.Viewer.scene.globe.ellipsoid;
        const c1 = ellipsoid.cartesianToCartographic(p1),
          c2 = ellipsoid.cartesianToCartographic(p2);
        const cm = new EllipsoidGeodesic(c1, c2).interpolateUsingFraction(0.5);
        const cp = ellipsoid.cartographicToCartesian(cm);
        tempPositions.push(p1);
        tempPositions.push(cp);
      }
      const last = pnts[num - 1];
      tempPositions.push(last);
      let total = 0;
      for (let i = 1; i < tempPositions.length; i++) {
        const p1 = tempPositions[i - 1];
        const p2 = tempPositions[i];
        const dis = Cartesian3.distance(p1, p2) / 1000;
        total += dis;
      }

      lineEntity &&
        lineEntity.polyline &&
        (lineEntity.polyline.positions = this.pointList as unknown as Property);
      const { infoDiv, listenerEvt } = infoBox(
        window.Viewer.container,
        this.pointList[this.pointList.length - 1],
        total.toFixed(2) + "km"
      );
      this.groundLengthDivList.push(infoDiv);
      this.groundLengthListenList.push(listenerEvt);
      tooltip.destory();
      this.destoryMeasure();
    }, ScreenSpaceEventType.RIGHT_CLICK);
  }

  //   * 获取贴地面积
  getGroundArea() {
    this.pointList = [];
    let areaEntity: null | Entity;
    const tooltip = new GlobeTooltip(window.Viewer.container);
    tooltip.setVisible(false);
    // * 监测鼠标左击事件
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
    }, ScreenSpaceEventType.LEFT_CLICK);

    // * 监测鼠标移动事件
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!defined(cartesian)) return;

      const position = evt.endPosition;
      if (this.pointList.length < 1) {
        tooltip.showAt(position, "<p>选择起点</p>");
        return;
      }
      if (this.pointList.length == 1) this.pointList.push(cartesian.clone());
      // * 若点击了一次就创建entity使用callback进行数据更新
      if (this.pointList.length == 2 && !areaEntity) {
        areaEntity = this.createAreaEntity(false);
        this.groundAreaEntityList.push(areaEntity);
      } else {
        // * 当鼠标移动时，修改最后一个值
        if (this.pointList.length >= 2)
          this.pointList.splice(
            this.pointList.length - 1,
            1,
            cartesian.clone()
          );
      }

      const num = this.pointList.length;
      let tip = "<p>点击添加下一个点</p>";
      if (num > 3) {
        tip += "<p>点击鼠标右键结束绘制</p>";
      }
      tooltip.showAt(position, tip);
    }, ScreenSpaceEventType.MOUSE_MOVE);
    // * 监测鼠标右击事件
    this.handler.setInputAction(() => {
      if (this.pointList.length < 3) return;
      const elliposid = Ellipsoid.WGS84,
        lonLatArray = [];
      for (const item of this.pointList) {
        const cartographic = elliposid.cartesianToCartographic(item);
        lonLatArray.push([
          cesiumMath.toDegrees(cartographic.longitude),
          cesiumMath.toDegrees(cartographic.latitude),
        ]);
      }
      lonLatArray.push(lonLatArray[0]);
      // * 将多边形转三角集
      const polygonGeoJson = turf.polygon([lonLatArray]);
      const triangles = turf.tesselate(polygonGeoJson);
      const promiseArray = [];
      for (const triangle of triangles.features) {
        const area = turf.area(triangle);
        const cellSize = Math.sqrt(area / 1000);
        // * 通过三个点形成一个矩形
        const enveloped = turf.envelope(triangle);
        // * 获取最大及最小的xy值
        const bbox = turf.bbox(enveloped);
        // * 通过最大最小点形成矩形内插值,返回点集
        const grid = turf.pointGrid(bbox, cellSize, { units: "meters" });
        // * 获取所有落在三角形内的点
        const trianglePoint = turf.pointsWithinPolygon(grid, triangle);
        const allPos = [];
        for (const triPoint of trianglePoint.features) {
          allPos.push(
            Cartographic.fromDegrees(
              triPoint.geometry.coordinates[0],
              triPoint.geometry.coordinates[1]
            )
          );
        }
        const promisePos = sampleTerrainMostDetailed(
          createWorldTerrain(),
          allPos
        );
        promiseArray.push(promisePos);
      }
      Promise.all(promiseArray).then((updatedPositions) => {
        let groundArea = 0;
        for (let m = 0; m < updatedPositions.length; m++) {
          const mapPos = new Map();
          for (let i = 0; i < updatedPositions[m].length; i++) {
            mapPos.set(
              updatedPositions[m][i].longitude.toString() +
                updatedPositions[m][i].latitude.toString(),
              updatedPositions[m][i].height
            );
          }
          const area = turf.area(triangles.features[m]);
          const cellSize = Math.sqrt(area / 1000);
          // * 通过三个点形成一个矩形
          const enveloped = turf.envelope(triangles.features[m]);
          // * 获取最大及最小的xy值
          const bbox = turf.bbox(enveloped);
          // * 通过最大最小点形成矩形内插值,返回点集
          const grid = turf.pointGrid(bbox, cellSize, { units: "meters" });
          // * 获取所有落在三角形内的点
          const trianglePoint = turf.pointsWithinPolygon(
            grid,
            triangles.features[m]
          );
          const tin = turf.tin(trianglePoint);
          for (let j = 0; j < tin.features.length; j++) {
            const car3Array = [];
            for (let k = 0; k < 3; k++) {
              const lon = tin.features[j].geometry.coordinates[0][k][0];
              const lat = tin.features[j].geometry.coordinates[0][k][1];
              const car2g = Cartographic.fromDegrees(lon, lat);
              const height = mapPos.get(
                car2g.longitude.toString() + car2g.latitude.toString()
              );
              car2g.height = height;
              car3Array.push(car2g);
            }
            const firstPoint2car3 = Cartesian3.fromRadians(
              car3Array[0].longitude,
              car3Array[0].latitude,
              car3Array[0].height
            );
            const secondPoint2car3 = Cartesian3.fromRadians(
              car3Array[1].longitude,
              car3Array[1].latitude,
              car3Array[1].height
            );
            const thirdPoint2car3 = Cartesian3.fromRadians(
              car3Array[2].longitude,
              car3Array[2].latitude,
              car3Array[2].height
            );
            const a = Cartesian3.distance(firstPoint2car3, secondPoint2car3);
            const b = Cartesian3.distance(thirdPoint2car3, secondPoint2car3);
            const c = Cartesian3.distance(firstPoint2car3, thirdPoint2car3);
            const p = (a + b + c) / 2;

            groundArea += Math.sqrt(p * (p - a) * (p - b) * (p - c));
          }
        }
        areaEntity &&
          areaEntity.polygon &&
          (areaEntity.polygon.hierarchy = new PolygonHierarchy(
            this.pointList
          ) as unknown as Property);
        const { infoDiv, listenerEvt } = infoBox(
          window.Viewer.container,
          this.pointList[this.pointList.length - 1],
          groundArea.toFixed(2) + "km²"
        );
        this.groundAreaDivList.push(infoDiv);
        this.groundAreaListenList.push(listenerEvt);
        tooltip.destory();
        this.destoryMeasure();
      });
    }, ScreenSpaceEventType.RIGHT_CLICK);
  }

  //   * 清除销毁测量
  destoryMeasure() {
    this.handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
    this.handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
    this.handler.removeInputAction(ScreenSpaceEventType.RIGHT_CLICK);
  }

  //   * 清除某一类测量
  clearOne(name: string) {
    switch (name) {
      case "getPlaneLength":
        this.planeLengthDivList.forEach((item) => {
          window.Viewer.container.removeChild(item);
        });
        this.planeLengthListenList.forEach((item) => {
          window.Viewer.scene.postRender.addEventListener(item);
        });
        this.planeLengthEntityList.forEach((item) => {
          window.Viewer.entities.remove(item);
        });
        this.planeLengthListenList = [];
        this.planeLengthDivList = [];
        this.planeLengthEntityList = [];
        this.pointList = [];
        break;
      case "getPlaneArea":
        this.planeAreaDivList.forEach((item) => {
          window.Viewer.container.removeChild(item);
        });
        this.planeAreaListenList.forEach((item) => {
          window.Viewer.scene.postRender.addEventListener(item);
        });
        this.planeAreaEntityList.forEach((item) => {
          window.Viewer.entities.remove(item);
        });
        this.planeAreaListenList = [];
        this.planeAreaDivList = [];
        this.planeAreaEntityList = [];
        this.pointList = [];
        break;
      case "getGroundLength":
        this.groundLengthDivList.forEach((item) => {
          window.Viewer.container.removeChild(item);
        });
        this.groundLengthListenList.forEach((item) => {
          window.Viewer.scene.postRender.addEventListener(item);
        });
        this.groundLengthEntityList.forEach((item) => {
          window.Viewer.entities.remove(item);
        });
        this.groundLengthListenList = [];
        this.groundLengthDivList = [];
        this.groundLengthEntityList = [];
        this.pointList = [];
        break;
      case "getGroundArea":
        this.groundAreaDivList.forEach((item) => {
          window.Viewer.container.removeChild(item);
        });
        this.groundAreaListenList.forEach((item) => {
          window.Viewer.scene.postRender.addEventListener(item);
        });
        this.groundAreaEntityList.forEach((item) => {
          window.Viewer.entities.remove(item);
        });
        this.groundAreaListenList = [];
        this.groundAreaDivList = [];
        this.groundAreaEntityList = [];
        this.pointList = [];
        break;
      default:
        break;
    }
  }
}
