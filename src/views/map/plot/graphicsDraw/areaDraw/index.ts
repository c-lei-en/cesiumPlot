import {
  Appearance,
  Billboard,
  CallbackProperty,
  Cartesian3,
  Color,
  defined,
  EllipseGeometry,
  Entity,
  GeometryInstance,
  GroundPrimitive,
  HeightReference,
  Material,
  Primitive,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  Math as cesiumMath,
  PolygonGeometry,
  PolygonHierarchy,
  Rectangle as cesiumRectangle,
  RectangleGeometry,
} from "cesium";
import { getCatesian3FromPX, cartesianToLonlat } from "../../tools";
import type { BaseAreaI, PlotFuncI, PointArr } from "./../../interface";
import { areaPlot } from "./algorithm";
import emitter from "@/mitt";

class BaseArea implements BaseAreaI {
  type: string;
  objId: number;
  handler: any;
  state: number;
  step: number;
  floatPoint: any;
  floatPointArr: any;
  areaPrimitive: any;
  areaEntity: any;
  modifyHandler: any;
  pointList: any[];
  material: any;
  selectPoint: any;
  clickStep: number;
  constructor(obj: BaseAreaI) {
    this.type = obj.type;
    this.objId = obj.objId;
    this.handler = obj.handler;
    this.areaPrimitive = obj.areaPrimitive;
    this.areaEntity = obj.areaEntity;
    this.state = obj.state; //state用于区分当前的状态 0 为删除 1为添加 2为编辑
    this.step = obj.step;
    this.floatPoint = obj.floatPoint;
    this.floatPointArr = obj.floatPointArr;
    this.modifyHandler = obj.modifyHandler;
    this.pointList = obj.pointList;
    this.material = obj.material;
    this.selectPoint = obj.selectPoint;
    this.clickStep = obj.clickStep;
  }
  disable() {
    if (this.areaPrimitive) {
      window.Viewer.polylines.remove(this.areaPrimitive);
      this.areaPrimitive = null;
    }
    this.state = -1;
    this.stopDraw();
  }
  stopDraw() {
    if (this.handler) {
      this.handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
      this.handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
      this.handler.removeInputAction(ScreenSpaceEventType.RIGHT_CLICK);
      this.handler.destroy();
      this.handler = null;
    }
    if (this.modifyHandler) {
      this.modifyHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
      this.modifyHandler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
      this.modifyHandler.removeInputAction(ScreenSpaceEventType.RIGHT_CLICK);
      this.modifyHandler.destroy();
      this.modifyHandler = null;
    }
  }
  creatPoint(cartesian: number[]): Primitive {
    return window.Viewer.billboards.add({
      id: "moveBillboard",
      position: cartesian,
      image: "/src/assets/icon/point.png",
      verticalOrigin: VerticalOrigin.BOTTOM,
      heightReference: HeightReference.CLAMP_TO_GROUND,
    });
  }
}

// * circle 圆
class Circle extends BaseArea implements PlotFuncI {
  constructor() {
    super({
      type: "Circle",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      areaPrimitive: null,
      areaEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      material: Material.fromType("Color", {
        color: Color.PINK.clone(),
      }),
      selectPoint: null,
      clickStep: 0,
    });
  }
  startDraw() {
    this.state = 1;
    // * 单击开始绘制，当点击第三次的时候完成绘制
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
      if (this.pointList.length == 3) {
        this.state = -1;
        this.pointList.pop();
        this.areaPrimitive = this.showPrimitiveOnMap();
        window.Viewer.entities.remove(this.areaEntity);
        window.Viewer.billboards.remove(this.floatPoint);
        this.areaEntity = null;
        this.floatPoint = null;
        this.stopDraw();
        emitter.emit("drawEnd");
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    // * 移动时改变物体positions
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!cartesian) return;
      if (this.floatPoint) this.floatPoint.position = cartesian.clone();
      else this.floatPoint = this.creatPoint(cartesian.clone());
      // * 只有当第一次点击之后再给pointList添加值
      if (this.pointList.length == 1) this.pointList.push(cartesian.clone());

      // * 若点击了一次就创建entity使用callback进行数据更新
      if (this.pointList.length == 2 && !this.areaEntity) {
        this.areaEntity = this.createEntity();
      } else {
        // * 当鼠标移动时，修改最后一个值
        if (this.pointList.length >= 2)
          this.pointList.splice(
            this.pointList.length - 1,
            1,
            cartesian.clone()
          );
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  startModify() {
    if (!this.modifyHandler)
      this.modifyHandler = new ScreenSpaceEventHandler(
        window.Viewer.scene.canvas
      );
    this.state = 2;
    this.pointList.forEach((point) => {
      const billboard = this.creatPoint(point);
      this.floatPointArr.push(billboard);
    });
    // 进入编辑之后将创建好的primitive删除，添加entity用以适应动态数据变化
    this.areaEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.areaPrimitive);
    this.areaPrimitive = null;

    this.modifyHandler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;

      // 如果有移动点在跟随鼠标移动，则在单击的时候固定此点的位置
      if (this.step != -1) {
        this.pointList[this.step] = cartesian.clone();
        this.step = -1;
        this.floatPoint = null;
        return;
      } else {
        // 如果没有移动点跟随鼠标移动，则在单击的时候查看是否有要素，如有则设置跟随点
        const feature = window.Viewer.scene.pick(evt.position);
        if (
          defined(feature) &&
          feature.primitive instanceof Billboard &&
          feature.primitive.id == "moveBillboard"
        ) {
          this.floatPoint = feature.primitive;
          this.step = this.floatPointArr.indexOf(this.floatPoint);
        } else {
          this.floatPoint = null;
          this.state = -1;
          this.floatPointArr.forEach((point: Billboard) => {
            window.Viewer.billboards.remove(point);
          });
          this.floatPointArr = [];
          this.areaPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.areaEntity);
          this.areaEntity = null;
          this.stopDraw();
          emitter.emit("modifiedEnd");
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    this.modifyHandler.setInputAction((evt: any) => {
      if (this.step != -1 && this.floatPoint) {
        const cartesian = getCatesian3FromPX(evt.endPosition);
        if (!cartesian) return;
        this.floatPoint.position = cartesian;
        this.pointList[this.step] = cartesian.clone();
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  createByData(data: PointArr[]) {
    this.pointList = data;
    this.areaPrimitive = this.showPrimitiveOnMap();
  }
  getLnglats(): PointArr[] {
    const arr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const item = cartesianToLonlat(this.pointList[i]);
      arr.push(item);
    }
    return arr;
  }
  getPositions(): any[] {
    return this.pointList;
  }
  // * 创建primitive进行展示
  showPrimitiveOnMap(): Primitive {
    const distance = Cartesian3.distance(this.pointList[0], this.pointList[1]);
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new EllipseGeometry({
        center: this.pointList[0],
        semiMajorAxis: distance,
        semiMinorAxis: distance,
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPrimitive({
        geometryInstances: instance,
        appearance: new Appearance({
          material: this.material,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      // * 计算曲线，若有两个点则应该直接返回两个点的连线，若有三个点则返回处理后的坐标集合
      if (this.pointList.length == 2) {
        return this.pointList[0];
      }
    };
    // * 通过坐标计算半径
    const computeDistance = () => {
      return Cartesian3.distance(this.pointList[0], this.pointList[1]);
    };
    return window.Viewer.entities.add({
      position: new CallbackProperty(update, false),
      ellipse: {
        material: Color.BLUE,
        clampToGround: true,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        semiMajorAxis: new CallbackProperty(computeDistance, false),
        semiMinorAxis: new CallbackProperty(computeDistance, false),
      },
    });
  }
}

// * ellipse 椭圆
class Ellipse extends BaseArea implements PlotFuncI {
  constructor() {
    super({
      type: "Ellipse",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      areaPrimitive: null,
      areaEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      material: Material.fromType("Color", {
        color: Color.PINK.clone(),
      }),
      selectPoint: null,
      clickStep: 0,
    });
  }
  startDraw() {
    this.state = 1;
    // * 单击开始绘制，当点击第三次的时候完成绘制
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
      if (this.pointList.length == 3) {
        this.state = -1;
        this.pointList.pop();
        this.areaPrimitive = this.showPrimitiveOnMap();
        window.Viewer.entities.remove(this.areaEntity);
        window.Viewer.billboards.remove(this.floatPoint);
        this.areaEntity = null;
        this.floatPoint = null;
        this.stopDraw();
        emitter.emit("drawEnd");
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    // * 移动时改变物体positions
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!cartesian) return;
      if (this.floatPoint) this.floatPoint.position = cartesian.clone();
      else this.floatPoint = this.creatPoint(cartesian.clone());
      // * 只有当第一次点击之后再给pointList添加值
      if (this.pointList.length == 1) this.pointList.push(cartesian.clone());

      // * 若点击了一次就创建entity使用callback进行数据更新
      if (this.pointList.length == 2 && !this.areaEntity) {
        this.areaEntity = this.createEntity();
      } else {
        // * 当鼠标移动时，修改最后一个值
        if (this.pointList.length >= 2)
          this.pointList.splice(
            this.pointList.length - 1,
            1,
            cartesian.clone()
          );
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  startModify() {
    if (!this.modifyHandler)
      this.modifyHandler = new ScreenSpaceEventHandler(
        window.Viewer.scene.canvas
      );
    this.state = 2;
    this.pointList.forEach((point) => {
      const billboard = this.creatPoint(point);
      this.floatPointArr.push(billboard);
    });
    // 进入编辑之后将创建好的primitive删除，添加entity用以适应动态数据变化
    this.areaEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.areaPrimitive);
    this.areaPrimitive = null;

    this.modifyHandler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;

      // 如果有移动点在跟随鼠标移动，则在单击的时候固定此点的位置
      if (this.step != -1) {
        this.pointList[this.step] = cartesian.clone();
        this.step = -1;
        this.floatPoint = null;
        return;
      } else {
        // 如果没有移动点跟随鼠标移动，则在单击的时候查看是否有要素，如有则设置跟随点
        const feature = window.Viewer.scene.pick(evt.position);
        if (
          defined(feature) &&
          feature.primitive instanceof Billboard &&
          feature.primitive.id == "moveBillboard"
        ) {
          this.floatPoint = feature.primitive;
          this.step = this.floatPointArr.indexOf(this.floatPoint);
        } else {
          this.floatPoint = null;
          this.state = -1;
          this.floatPointArr.forEach((point: Billboard) => {
            window.Viewer.billboards.remove(point);
          });
          this.floatPointArr = [];
          this.areaPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.areaEntity);
          this.areaEntity = null;
          this.stopDraw();
          emitter.emit("modifiedEnd");
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    this.modifyHandler.setInputAction((evt: any) => {
      if (this.step != -1 && this.floatPoint) {
        const cartesian = getCatesian3FromPX(evt.endPosition);
        if (!cartesian) return;
        this.floatPoint.position = cartesian;
        this.pointList[this.step] = cartesian.clone();
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  createByData(data: PointArr[]) {
    this.pointList = data;
    this.areaPrimitive = this.showPrimitiveOnMap();
  }
  getLnglats(): PointArr[] {
    const arr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const item = cartesianToLonlat(this.pointList[i]);
      arr.push(item);
    }
    return arr;
  }
  getPositions(): any[] {
    return this.pointList;
  }
  // * 创建primitive进行展示
  showPrimitiveOnMap(): Primitive {
    const maxDistance = Cartesian3.distance(
      this.pointList[0],
      this.pointList[1]
    );
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new EllipseGeometry({
        center: this.pointList[0],
        semiMajorAxis: maxDistance,
        semiMinorAxis: maxDistance / 2,
        rotation: this.computeRoate(),
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPrimitive({
        geometryInstances: instance,
        appearance: new Appearance({
          material: this.material,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      // * 计算曲线，若有两个点则应该直接返回两个点的连线，若有三个点则返回处理后的坐标集合
      if (this.pointList.length == 2) {
        return this.pointList[0];
      }
    };
    // * 通过坐标计算长半轴
    const computeMaxDistance = () => {
      const maxDistance = Cartesian3.distance(
        this.pointList[0],
        this.pointList[1]
      );
      return maxDistance;
    };
    // * 通过坐标计算短半轴
    const computeMinDistance = () => {
      const minDistance =
        Cartesian3.distance(this.pointList[0], this.pointList[1]) / 2;
      return minDistance;
    };
    // * 计算椭圆朝向
    const computeRoate = () => {
      return this.computeRoate.apply(this);
    };
    return window.Viewer.entities.add({
      position: new CallbackProperty(update, false),
      ellipse: {
        material: Color.BLUE,
        clampToGround: true,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        semiMajorAxis: new CallbackProperty(computeMaxDistance, false),
        semiMinorAxis: new CallbackProperty(computeMinDistance, false),
        rotation: new CallbackProperty(computeRoate, false),
      },
    });
  }
  computeRoate() {
    if (
      (this.pointList[0].x >= this.pointList[1].x &&
        this.pointList[0].y >= this.pointList[1].y) ||
      (this.pointList[0].x < this.pointList[1].x &&
        this.pointList[0].y < this.pointList[1].y)
    ) {
      return Math.atan2(
        Math.abs(this.pointList[0].y - this.pointList[1].y),
        Math.abs(this.pointList[0].x - this.pointList[1].x)
      );
    } else {
      return (
        cesiumMath.toRadians(cesiumMath.TWO_PI) -
        Math.atan2(
          Math.abs(this.pointList[0].y - this.pointList[1].y),
          Math.abs(this.pointList[0].x - this.pointList[1].x)
        )
      );
    }
  }
}

// * lune 椭圆
class Lune extends BaseArea implements PlotFuncI {
  constructor() {
    super({
      type: "Lune",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      areaPrimitive: null,
      areaEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      material: Material.fromType("Color", {
        color: Color.PINK.clone(),
      }),
      selectPoint: null,
      clickStep: 0,
    });
  }
  startDraw() {
    this.state = 1;
    // * 单击开始绘制，当点击第三次的时候完成绘制
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
      if (this.pointList.length == 4) {
        this.state = -1;
        this.pointList.pop();
        this.areaPrimitive = this.showPrimitiveOnMap();
        window.Viewer.entities.remove(this.areaEntity);
        window.Viewer.billboards.remove(this.floatPoint);
        this.areaEntity = null;
        this.floatPoint = null;
        this.stopDraw();
        emitter.emit("drawEnd");
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    // * 移动时改变物体positions
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!cartesian) return;
      if (this.floatPoint) this.floatPoint.position = cartesian.clone();
      else this.floatPoint = this.creatPoint(cartesian.clone());
      // * 只有当第一次点击之后再给pointList添加值
      if (this.pointList.length == 1) this.pointList.push(cartesian.clone());

      // * 若点击了一次就创建entity使用callback进行数据更新
      if (this.pointList.length == 2 && !this.areaEntity) {
        this.areaEntity = this.createEntity();
      } else {
        // * 当鼠标移动时，修改最后一个值
        if (this.pointList.length >= 2)
          this.pointList.splice(
            this.pointList.length - 1,
            1,
            cartesian.clone()
          );
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  startModify() {
    if (!this.modifyHandler)
      this.modifyHandler = new ScreenSpaceEventHandler(
        window.Viewer.scene.canvas
      );
    this.state = 2;
    this.pointList.forEach((point) => {
      const billboard = this.creatPoint(point);
      this.floatPointArr.push(billboard);
    });
    // 进入编辑之后将创建好的primitive删除，添加entity用以适应动态数据变化
    this.areaEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.areaPrimitive);
    this.areaPrimitive = null;

    this.modifyHandler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;

      // 如果有移动点在跟随鼠标移动，则在单击的时候固定此点的位置
      if (this.step != -1) {
        this.pointList[this.step] = cartesian.clone();
        this.step = -1;
        this.floatPoint = null;
        return;
      } else {
        // 如果没有移动点跟随鼠标移动，则在单击的时候查看是否有要素，如有则设置跟随点
        const feature = window.Viewer.scene.pick(evt.position);
        if (
          defined(feature) &&
          feature.primitive instanceof Billboard &&
          feature.primitive.id == "moveBillboard"
        ) {
          this.floatPoint = feature.primitive;
          this.step = this.floatPointArr.indexOf(this.floatPoint);
        } else {
          this.floatPoint = null;
          this.state = -1;
          this.floatPointArr.forEach((point: Billboard) => {
            window.Viewer.billboards.remove(point);
          });
          this.floatPointArr = [];
          this.areaPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.areaEntity);
          this.areaEntity = null;
          this.stopDraw();
          emitter.emit("modifiedEnd");
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    this.modifyHandler.setInputAction((evt: any) => {
      if (this.step != -1 && this.floatPoint) {
        const cartesian = getCatesian3FromPX(evt.endPosition);
        if (!cartesian) return;
        this.floatPoint.position = cartesian;
        this.pointList[this.step] = cartesian.clone();
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  createByData(data: PointArr[]) {
    this.pointList = data;
    this.areaPrimitive = this.showPrimitiveOnMap();
  }
  getLnglats(): PointArr[] {
    const arr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const item = cartesianToLonlat(this.pointList[i]);
      arr.push(item);
    }
    return arr;
  }
  getPositions(): any[] {
    return this.pointList;
  }
  // * 创建primitive进行展示
  showPrimitiveOnMap(): Primitive {
    const lnglatArr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const lnglat = cartesianToLonlat(this.pointList[i]);
      lnglatArr.push(lnglat);
    }
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new PolygonGeometry({
        polygonHierarchy: new PolygonHierarchy(
          areaPlot.algorithm.getArcPositions(lnglatArr)
        ),
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPrimitive({
        geometryInstances: instance,
        appearance: new Appearance({
          material: this.material,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      // * 计算坐标
      const lnglatArr = [];
      for (let i = 0; i < this.pointList.length; i++) {
        const lnglat = cartesianToLonlat(this.pointList[i]);
        lnglatArr.push(lnglat);
      }
      const res = areaPlot.algorithm.getArcPositions(lnglatArr);
      return new PolygonHierarchy(res);
    };
    return window.Viewer.entities.add({
      polygon: {
        hierarchy: new CallbackProperty(update, false),
        material: Color.BLUE,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}

// * Sector 扇形
class Sector extends BaseArea implements PlotFuncI {
  constructor() {
    super({
      type: "Sector",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      areaPrimitive: null,
      areaEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      material: Material.fromType("Color", {
        color: Color.PINK.clone(),
      }),
      selectPoint: null,
      clickStep: 0,
    });
  }
  startDraw() {
    this.state = 1;
    // * 单击开始绘制，当点击第三次的时候完成绘制
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
      if (this.pointList.length == 4) {
        this.state = -1;
        this.pointList.pop();
        this.areaPrimitive = this.showPrimitiveOnMap();
        window.Viewer.entities.remove(this.areaEntity);
        window.Viewer.billboards.remove(this.floatPoint);
        this.areaEntity = null;
        this.floatPoint = null;
        this.stopDraw();
        emitter.emit("drawEnd");
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    // * 移动时改变物体positions
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!cartesian) return;
      if (this.floatPoint) this.floatPoint.position = cartesian.clone();
      else this.floatPoint = this.creatPoint(cartesian.clone());
      // * 只有当第一次点击之后再给pointList添加值
      if (this.pointList.length == 1) this.pointList.push(cartesian.clone());

      // * 若点击了一次就创建entity使用callback进行数据更新
      if (this.pointList.length == 2 && !this.areaEntity) {
        this.areaEntity = this.createEntity();
      } else {
        // * 当鼠标移动时，修改最后一个值
        if (this.pointList.length >= 2)
          this.pointList.splice(
            this.pointList.length - 1,
            1,
            cartesian.clone()
          );
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  startModify() {
    if (!this.modifyHandler)
      this.modifyHandler = new ScreenSpaceEventHandler(
        window.Viewer.scene.canvas
      );
    this.state = 2;
    this.pointList.forEach((point) => {
      const billboard = this.creatPoint(point);
      this.floatPointArr.push(billboard);
    });
    // 进入编辑之后将创建好的primitive删除，添加entity用以适应动态数据变化
    this.areaEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.areaPrimitive);
    this.areaPrimitive = null;

    this.modifyHandler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;

      // 如果有移动点在跟随鼠标移动，则在单击的时候固定此点的位置
      if (this.step != -1) {
        this.pointList[this.step] = cartesian.clone();
        this.step = -1;
        this.floatPoint = null;
        return;
      } else {
        // 如果没有移动点跟随鼠标移动，则在单击的时候查看是否有要素，如有则设置跟随点
        const feature = window.Viewer.scene.pick(evt.position);
        if (
          defined(feature) &&
          feature.primitive instanceof Billboard &&
          feature.primitive.id == "moveBillboard"
        ) {
          this.floatPoint = feature.primitive;
          this.step = this.floatPointArr.indexOf(this.floatPoint);
        } else {
          this.floatPoint = null;
          this.state = -1;
          this.floatPointArr.forEach((point: Billboard) => {
            window.Viewer.billboards.remove(point);
          });
          this.floatPointArr = [];
          this.areaPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.areaEntity);
          this.areaEntity = null;
          this.stopDraw();
          emitter.emit("modifiedEnd");
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    this.modifyHandler.setInputAction((evt: any) => {
      if (this.step != -1 && this.floatPoint) {
        const cartesian = getCatesian3FromPX(evt.endPosition);
        if (!cartesian) return;
        this.floatPoint.position = cartesian;
        this.pointList[this.step] = cartesian.clone();
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  createByData(data: PointArr[]) {
    this.pointList = data;
    this.areaPrimitive = this.showPrimitiveOnMap();
  }
  getLnglats(): PointArr[] {
    const arr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const item = cartesianToLonlat(this.pointList[i]);
      arr.push(item);
    }
    return arr;
  }
  getPositions(): any[] {
    return this.pointList;
  }
  // * 创建primitive进行展示
  showPrimitiveOnMap(): Primitive {
    const lnglatArr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const lnglat = cartesianToLonlat(this.pointList[i]);
      lnglatArr.push(lnglat);
    }
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new PolygonGeometry({
        polygonHierarchy: new PolygonHierarchy(
          areaPlot.algorithm.getSectorPositions(lnglatArr)
        ),
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPrimitive({
        geometryInstances: instance,
        appearance: new Appearance({
          material: this.material,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      // * 计算坐标
      const lnglatArr = [];
      for (let i = 0; i < this.pointList.length; i++) {
        const lnglat = cartesianToLonlat(this.pointList[i]);
        lnglatArr.push(lnglat);
      }
      if (lnglatArr.length == 2) {
        lnglatArr.push([lnglatArr[1][0] + 0.0000001, lnglatArr[1][1]]);
      }
      const res = areaPlot.algorithm.getSectorPositions(lnglatArr);
      return new PolygonHierarchy(res);
    };
    return window.Viewer.entities.add({
      polygon: {
        hierarchy: new CallbackProperty(update, false),
        material: Color.BLUE,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}

// * Rectangle 矩形
class Rectangle extends BaseArea implements PlotFuncI {
  constructor() {
    super({
      type: "Rectangle",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      areaPrimitive: null,
      areaEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      material: Material.fromType("Color", {
        color: Color.PINK.clone(),
      }),
      selectPoint: null,
      clickStep: 0,
    });
  }
  startDraw() {
    this.state = 1;
    // * 单击开始绘制，当点击第三次的时候完成绘制
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
      if (this.pointList.length == 3) {
        this.state = -1;
        this.pointList.pop();
        this.areaPrimitive = this.showPrimitiveOnMap();
        window.Viewer.entities.remove(this.areaEntity);
        window.Viewer.billboards.remove(this.floatPoint);
        this.areaEntity = null;
        this.floatPoint = null;
        this.stopDraw();
        emitter.emit("drawEnd");
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    // * 移动时改变物体positions
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!cartesian) return;
      if (this.floatPoint) this.floatPoint.position = cartesian.clone();
      else this.floatPoint = this.creatPoint(cartesian.clone());
      // * 只有当第一次点击之后再给pointList添加值
      if (this.pointList.length == 1) this.pointList.push(cartesian.clone());

      // * 若点击了一次就创建entity使用callback进行数据更新
      if (this.pointList.length == 2 && !this.areaEntity) {
        this.areaEntity = this.createEntity();
      } else {
        // * 当鼠标移动时，修改最后一个值
        if (this.pointList.length >= 2)
          this.pointList.splice(
            this.pointList.length - 1,
            1,
            cartesian.clone()
          );
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  startModify() {
    if (!this.modifyHandler)
      this.modifyHandler = new ScreenSpaceEventHandler(
        window.Viewer.scene.canvas
      );
    this.state = 2;
    this.pointList.forEach((point) => {
      const billboard = this.creatPoint(point);
      this.floatPointArr.push(billboard);
    });
    // 进入编辑之后将创建好的primitive删除，添加entity用以适应动态数据变化
    this.areaEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.areaPrimitive);
    this.areaPrimitive = null;

    this.modifyHandler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;

      // 如果有移动点在跟随鼠标移动，则在单击的时候固定此点的位置
      if (this.step != -1) {
        this.pointList[this.step] = cartesian.clone();
        this.step = -1;
        this.floatPoint = null;
        return;
      } else {
        // 如果没有移动点跟随鼠标移动，则在单击的时候查看是否有要素，如有则设置跟随点
        const feature = window.Viewer.scene.pick(evt.position);
        if (
          defined(feature) &&
          feature.primitive instanceof Billboard &&
          feature.primitive.id == "moveBillboard"
        ) {
          this.floatPoint = feature.primitive;
          this.step = this.floatPointArr.indexOf(this.floatPoint);
        } else {
          this.floatPoint = null;
          this.state = -1;
          this.floatPointArr.forEach((point: Billboard) => {
            window.Viewer.billboards.remove(point);
          });
          this.floatPointArr = [];
          this.areaPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.areaEntity);
          this.areaEntity = null;
          this.stopDraw();
          emitter.emit("modifiedEnd");
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    this.modifyHandler.setInputAction((evt: any) => {
      if (this.step != -1 && this.floatPoint) {
        const cartesian = getCatesian3FromPX(evt.endPosition);
        if (!cartesian) return;
        this.floatPoint.position = cartesian;
        this.pointList[this.step] = cartesian.clone();
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  createByData(data: PointArr[]) {
    this.pointList = data;
    this.areaPrimitive = this.showPrimitiveOnMap();
  }
  getLnglats(): PointArr[] {
    const arr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const item = cartesianToLonlat(this.pointList[i]);
      arr.push(item);
    }
    return arr;
  }
  getPositions(): any[] {
    return this.pointList;
  }
  // * 创建primitive进行展示
  showPrimitiveOnMap(): Primitive {
    const lnglatArr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const lnglat = cartesianToLonlat(this.pointList[i]);
      lnglatArr.push(lnglat);
    }
    const res = areaPlot.algorithm.getRectanglePositions(
      lnglatArr[0],
      lnglatArr[1]
    );
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new RectangleGeometry({
        rectangle: cesiumRectangle.fromDegrees(res[0], res[2], res[1], res[3]),
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPrimitive({
        geometryInstances: instance,
        appearance: new Appearance({
          material: this.material,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      // * 计算坐标
      const lnglatArr = [];
      for (let i = 0; i < this.pointList.length; i++) {
        const lnglat = cartesianToLonlat(this.pointList[i]);
        lnglatArr.push(lnglat);
      }
      const res = areaPlot.algorithm.getRectanglePositions(
        lnglatArr[0],
        lnglatArr[1]
      );
      return cesiumRectangle.fromDegrees(res[0], res[2], res[1], res[3]);
    };
    return window.Viewer.entities.add({
      rectangle: {
        coordinates: new CallbackProperty(update, false),
        material: Color.BLUE,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}

// * closedCurve 曲线面
class ClosedCurve extends BaseArea implements PlotFuncI {
  constructor() {
    super({
      type: "ClosedCurve",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      areaPrimitive: null,
      areaEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      material: Material.fromType("Color", {
        color: Color.PINK.clone(),
      }),
      selectPoint: null,
      clickStep: 0,
    });
  }
  startDraw() {
    this.state = 1;
    // * 单击开始绘制，当点击第三次的时候完成绘制
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
    }, ScreenSpaceEventType.LEFT_CLICK);
    // * 移动时改变物体positions
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!cartesian) return;
      if (this.floatPoint) this.floatPoint.position = cartesian.clone();
      else this.floatPoint = this.creatPoint(cartesian.clone());
      // * 只有当第一次点击之后再给pointList添加值
      if (this.pointList.length == 1) this.pointList.push(cartesian.clone());

      // * 若点击了一次就创建entity使用callback进行数据更新
      if (this.pointList.length == 2 && !this.areaEntity) {
        this.areaEntity = this.createEntity();
      } else {
        // * 当鼠标移动时，修改最后一个值
        if (this.pointList.length >= 2)
          this.pointList.splice(
            this.pointList.length - 1,
            1,
            cartesian.clone()
          );
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
    // * 鼠标右击完成绘制
    this.handler.setInputAction(() => {
      if (this.pointList.length < 3) return;
      this.state = -1;
      this.pointList.pop();
      this.areaPrimitive = this.showPrimitiveOnMap();
      window.Viewer.entities.remove(this.areaEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.areaEntity = null;
      this.floatPoint = null;
      this.stopDraw();
      emitter.emit("drawEnd");
    }, ScreenSpaceEventType.RIGHT_CLICK);
  }
  startModify() {
    if (!this.modifyHandler)
      this.modifyHandler = new ScreenSpaceEventHandler(
        window.Viewer.scene.canvas
      );
    this.state = 2;
    this.pointList.forEach((point) => {
      const billboard = this.creatPoint(point);
      this.floatPointArr.push(billboard);
    });
    // 进入编辑之后将创建好的primitive删除，添加entity用以适应动态数据变化
    this.areaEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.areaPrimitive);
    this.areaPrimitive = null;

    this.modifyHandler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;

      // 如果有移动点在跟随鼠标移动，则在单击的时候固定此点的位置
      if (this.step != -1) {
        this.pointList[this.step] = cartesian.clone();
        this.step = -1;
        this.floatPoint = null;
        return;
      } else {
        // 如果没有移动点跟随鼠标移动，则在单击的时候查看是否有要素，如有则设置跟随点
        const feature = window.Viewer.scene.pick(evt.position);
        if (
          defined(feature) &&
          feature.primitive instanceof Billboard &&
          feature.primitive.id == "moveBillboard"
        ) {
          this.floatPoint = feature.primitive;
          this.step = this.floatPointArr.indexOf(this.floatPoint);
        } else {
          this.floatPoint = null;
          this.state = -1;
          this.floatPointArr.forEach((point: Billboard) => {
            window.Viewer.billboards.remove(point);
          });
          this.floatPointArr = [];
          this.areaPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.areaEntity);
          this.areaEntity = null;
          this.stopDraw();
          emitter.emit("modifiedEnd");
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    this.modifyHandler.setInputAction((evt: any) => {
      if (this.step != -1 && this.floatPoint) {
        const cartesian = getCatesian3FromPX(evt.endPosition);
        if (!cartesian) return;
        this.floatPoint.position = cartesian;
        this.pointList[this.step] = cartesian.clone();
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  createByData(data: PointArr[]) {
    this.pointList = data;
    this.areaPrimitive = this.showPrimitiveOnMap();
  }
  getLnglats(): PointArr[] {
    const arr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const item = cartesianToLonlat(this.pointList[i]);
      arr.push(item);
    }
    return arr;
  }
  getPositions(): any[] {
    return this.pointList;
  }
  // * 创建primitive进行展示
  showPrimitiveOnMap(): Primitive {
    const lnglatArr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const lnglat = cartesianToLonlat(this.pointList[i]);
      lnglatArr.push(lnglat);
    }
    const res = areaPlot.algorithm.getClosedCurvePositions(lnglatArr);
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new PolygonGeometry({
        polygonHierarchy: new PolygonHierarchy(res),
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPrimitive({
        geometryInstances: instance,
        appearance: new Appearance({
          material: this.material,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      // * 计算坐标
      const lnglatArr = [];
      for (let i = 0; i < this.pointList.length; i++) {
        const lnglat = cartesianToLonlat(this.pointList[i]);
        lnglatArr.push(lnglat);
      }
      const res = areaPlot.algorithm.getClosedCurvePositions(lnglatArr);
      return new PolygonHierarchy(res);
    };
    return window.Viewer.entities.add({
      polygon: {
        hierarchy: new CallbackProperty(update, false),
        material: Color.BLUE,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}

// * polygon 多边形
class Polygon extends BaseArea implements PlotFuncI {
  constructor() {
    super({
      type: "Polygon",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      areaPrimitive: null,
      areaEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      material: Material.fromType("Color", {
        color: Color.PINK.clone(),
      }),
      selectPoint: null,
      clickStep: 0,
    });
  }
  startDraw() {
    this.state = 1;
    // * 单击开始绘制，当点击第三次的时候完成绘制
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
    }, ScreenSpaceEventType.LEFT_CLICK);
    // * 移动时改变物体positions
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!cartesian) return;
      if (this.floatPoint) this.floatPoint.position = cartesian.clone();
      else this.floatPoint = this.creatPoint(cartesian.clone());
      // * 只有当第一次点击之后再给pointList添加值
      if (this.pointList.length == 1) this.pointList.push(cartesian.clone());

      // * 若点击了一次就创建entity使用callback进行数据更新
      if (this.pointList.length == 2 && !this.areaEntity) {
        this.areaEntity = this.createEntity();
      } else {
        // * 当鼠标移动时，修改最后一个值
        if (this.pointList.length >= 2)
          this.pointList.splice(
            this.pointList.length - 1,
            1,
            cartesian.clone()
          );
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
    // * 鼠标右击完成绘制
    this.handler.setInputAction(() => {
      if (this.pointList.length < 3) return;
      this.state = -1;
      this.pointList.pop();
      this.areaPrimitive = this.showPrimitiveOnMap();
      window.Viewer.entities.remove(this.areaEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.areaEntity = null;
      this.floatPoint = null;
      this.stopDraw();
      emitter.emit("drawEnd");
    }, ScreenSpaceEventType.RIGHT_CLICK);
  }
  startModify() {
    if (!this.modifyHandler)
      this.modifyHandler = new ScreenSpaceEventHandler(
        window.Viewer.scene.canvas
      );
    this.state = 2;
    this.pointList.forEach((point) => {
      const billboard = this.creatPoint(point);
      this.floatPointArr.push(billboard);
    });
    // 进入编辑之后将创建好的primitive删除，添加entity用以适应动态数据变化
    this.areaEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.areaPrimitive);
    this.areaPrimitive = null;

    this.modifyHandler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;

      // 如果有移动点在跟随鼠标移动，则在单击的时候固定此点的位置
      if (this.step != -1) {
        this.pointList[this.step] = cartesian.clone();
        this.step = -1;
        this.floatPoint = null;
        return;
      } else {
        // 如果没有移动点跟随鼠标移动，则在单击的时候查看是否有要素，如有则设置跟随点
        const feature = window.Viewer.scene.pick(evt.position);
        if (
          defined(feature) &&
          feature.primitive instanceof Billboard &&
          feature.primitive.id == "moveBillboard"
        ) {
          this.floatPoint = feature.primitive;
          this.step = this.floatPointArr.indexOf(this.floatPoint);
        } else {
          this.floatPoint = null;
          this.state = -1;
          this.floatPointArr.forEach((point: Billboard) => {
            window.Viewer.billboards.remove(point);
          });
          this.floatPointArr = [];
          this.areaPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.areaEntity);
          this.areaEntity = null;
          this.stopDraw();
          emitter.emit("modifiedEnd");
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    this.modifyHandler.setInputAction((evt: any) => {
      if (this.step != -1 && this.floatPoint) {
        const cartesian = getCatesian3FromPX(evt.endPosition);
        if (!cartesian) return;
        this.floatPoint.position = cartesian;
        this.pointList[this.step] = cartesian.clone();
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  createByData(data: PointArr[]) {
    this.pointList = data;
    this.areaPrimitive = this.showPrimitiveOnMap();
  }
  getLnglats(): PointArr[] {
    const arr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const item = cartesianToLonlat(this.pointList[i]);
      arr.push(item);
    }
    return arr;
  }
  getPositions(): any[] {
    return this.pointList;
  }
  // * 创建primitive进行展示
  showPrimitiveOnMap(): Primitive {
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new PolygonGeometry({
        polygonHierarchy: new PolygonHierarchy(this.pointList),
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPrimitive({
        geometryInstances: instance,
        appearance: new Appearance({
          material: this.material,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      return new PolygonHierarchy(this.pointList);
    };
    return window.Viewer.entities.add({
      polygon: {
        hierarchy: new CallbackProperty(update, false),
        material: Color.BLUE,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}

// * freeHandPolygon 多边形
class FreeHandPolygon extends BaseArea implements PlotFuncI {
  constructor() {
    super({
      type: "FreeHandPolygon",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      areaPrimitive: null,
      areaEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      material: Material.fromType("Color", {
        color: Color.PINK.clone(),
      }),
      selectPoint: null,
      clickStep: 0,
    });
  }
  startDraw() {
    this.state = 1;
    // * 单击开始绘制，当点击第三次的时候完成绘制
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
    }, ScreenSpaceEventType.LEFT_CLICK);
    // * 移动时改变物体positions
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!cartesian) return;
      if (this.floatPoint) this.floatPoint.position = cartesian.clone();
      else this.floatPoint = this.creatPoint(cartesian.clone());
      // * 只有当第一次点击之后再给pointList添加值
      if (this.pointList.length == 1) this.pointList.push(cartesian.clone());

      // * 若点击了一次就创建entity使用callback进行数据更新
      if (this.pointList.length == 2 && !this.areaEntity) {
        this.areaEntity = this.createEntity();
      } else if (this.pointList.length >= 2) {
        // * 随着鼠标移动添加数据
        this.pointList.push(cartesian.clone());
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
    // * 鼠标右击完成绘制
    this.handler.setInputAction(() => {
      if (this.pointList.length < 3) return;
      this.state = -1;
      this.pointList.pop();
      this.areaPrimitive = this.showPrimitiveOnMap();
      window.Viewer.entities.remove(this.areaEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.areaEntity = null;
      this.floatPoint = null;
      this.stopDraw();
      emitter.emit("drawEnd");
    }, ScreenSpaceEventType.RIGHT_CLICK);
  }
  startModify() {
    if (!this.modifyHandler)
      this.modifyHandler = new ScreenSpaceEventHandler(
        window.Viewer.scene.canvas
      );
    this.state = 2;
    this.pointList.forEach((point) => {
      const billboard = this.creatPoint(point);
      this.floatPointArr.push(billboard);
    });
    // 进入编辑之后将创建好的primitive删除，添加entity用以适应动态数据变化
    this.areaEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.areaPrimitive);
    this.areaPrimitive = null;

    this.modifyHandler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;

      // 如果有移动点在跟随鼠标移动，则在单击的时候固定此点的位置
      if (this.step != -1) {
        this.pointList[this.step] = cartesian.clone();
        this.step = -1;
        this.floatPoint = null;
        return;
      } else {
        // 如果没有移动点跟随鼠标移动，则在单击的时候查看是否有要素，如有则设置跟随点
        const feature = window.Viewer.scene.pick(evt.position);
        if (
          defined(feature) &&
          feature.primitive instanceof Billboard &&
          feature.primitive.id == "moveBillboard"
        ) {
          this.floatPoint = feature.primitive;
          this.step = this.floatPointArr.indexOf(this.floatPoint);
        } else {
          this.floatPoint = null;
          this.state = -1;
          this.floatPointArr.forEach((point: Billboard) => {
            window.Viewer.billboards.remove(point);
          });
          this.floatPointArr = [];
          this.areaPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.areaEntity);
          this.areaEntity = null;
          this.stopDraw();
          emitter.emit("modifiedEnd");
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    this.modifyHandler.setInputAction((evt: any) => {
      if (this.step != -1 && this.floatPoint) {
        const cartesian = getCatesian3FromPX(evt.endPosition);
        if (!cartesian) return;
        this.floatPoint.position = cartesian;
        this.pointList[this.step] = cartesian.clone();
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  createByData(data: PointArr[]) {
    this.pointList = data;
    this.areaPrimitive = this.showPrimitiveOnMap();
  }
  getLnglats(): PointArr[] {
    const arr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const item = cartesianToLonlat(this.pointList[i]);
      arr.push(item);
    }
    return arr;
  }
  getPositions(): any[] {
    return this.pointList;
  }
  // * 创建primitive进行展示
  showPrimitiveOnMap(): Primitive {
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new PolygonGeometry({
        polygonHierarchy: new PolygonHierarchy(this.pointList),
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPrimitive({
        geometryInstances: instance,
        appearance: new Appearance({
          material: this.material,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      return new PolygonHierarchy(this.pointList);
    };
    return window.Viewer.entities.add({
      polygon: {
        hierarchy: new CallbackProperty(update, false),
        material: Color.BLUE,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}

// * gatheringPlace 多边形
class GatheringPlace extends BaseArea implements PlotFuncI {
  constructor() {
    super({
      type: "GatheringPlace",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      areaPrimitive: null,
      areaEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      material: Material.fromType("Color", {
        color: Color.PINK.clone(),
      }),
      selectPoint: null,
      clickStep: 0,
    });
  }
  startDraw() {
    this.state = 1;
    // * 单击开始绘制，当点击第三次的时候完成绘制
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.pointList.push(cartesian.clone());
      if (this.pointList.length == 4) {
        this.state = -1;
        this.pointList.pop();
        this.areaPrimitive = this.showPrimitiveOnMap();
        window.Viewer.entities.remove(this.areaEntity);
        window.Viewer.billboards.remove(this.floatPoint);
        this.areaEntity = null;
        this.floatPoint = null;
        this.stopDraw();
        emitter.emit("drawEnd");
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    // * 移动时改变物体positions
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!cartesian) return;
      if (this.floatPoint) this.floatPoint.position = cartesian.clone();
      else this.floatPoint = this.creatPoint(cartesian.clone());
      // * 只有当第一次点击之后再给pointList添加值
      if (this.pointList.length == 1) this.pointList.push(cartesian.clone());
      // * 若点击了一次就创建entity使用callback进行数据更新
      if (this.pointList.length == 2 && !this.areaEntity) {
        this.areaEntity = this.createEntity();
      } else {
        // * 当鼠标移动时，修改最后一个值
        if (this.pointList.length >= 2)
          this.pointList.splice(
            this.pointList.length - 1,
            1,
            cartesian.clone()
          );
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  startModify() {
    if (!this.modifyHandler)
      this.modifyHandler = new ScreenSpaceEventHandler(
        window.Viewer.scene.canvas
      );
    this.state = 2;
    this.pointList.forEach((point) => {
      const billboard = this.creatPoint(point);
      this.floatPointArr.push(billboard);
    });
    // 进入编辑之后将创建好的primitive删除，添加entity用以适应动态数据变化
    this.areaEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.areaPrimitive);
    this.areaPrimitive = null;

    this.modifyHandler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;

      // 如果有移动点在跟随鼠标移动，则在单击的时候固定此点的位置
      if (this.step != -1) {
        this.pointList[this.step] = cartesian.clone();
        this.step = -1;
        this.floatPoint = null;
        return;
      } else {
        // 如果没有移动点跟随鼠标移动，则在单击的时候查看是否有要素，如有则设置跟随点
        const feature = window.Viewer.scene.pick(evt.position);
        if (
          defined(feature) &&
          feature.primitive instanceof Billboard &&
          feature.primitive.id == "moveBillboard"
        ) {
          this.floatPoint = feature.primitive;
          this.step = this.floatPointArr.indexOf(this.floatPoint);
        } else {
          this.floatPoint = null;
          this.state = -1;
          this.floatPointArr.forEach((point: Billboard) => {
            window.Viewer.billboards.remove(point);
          });
          this.floatPointArr = [];
          this.areaPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.areaEntity);
          this.areaEntity = null;
          this.stopDraw();
          emitter.emit("modifiedEnd");
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    this.modifyHandler.setInputAction((evt: any) => {
      if (this.step != -1 && this.floatPoint) {
        const cartesian = getCatesian3FromPX(evt.endPosition);
        if (!cartesian) return;
        this.floatPoint.position = cartesian;
        this.pointList[this.step] = cartesian.clone();
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  createByData(data: PointArr[]) {
    this.pointList = data;
    this.areaPrimitive = this.showPrimitiveOnMap();
  }
  getLnglats(): PointArr[] {
    const arr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const item = cartesianToLonlat(this.pointList[i]);
      arr.push(item);
    }
    return arr;
  }
  getPositions(): any[] {
    return this.pointList;
  }
  // * 创建primitive进行展示
  showPrimitiveOnMap(): Primitive {
    // * 计算坐标
    const lnglatArr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const lnglat = cartesianToLonlat(this.pointList[i]);
      lnglatArr.push(lnglat);
    }
    const res = areaPlot.algorithm.getGatheringPlacePositions(lnglatArr);
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new PolygonGeometry({
        polygonHierarchy: new PolygonHierarchy(res),
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPrimitive({
        geometryInstances: instance,
        appearance: new Appearance({
          material: this.material,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      // * 计算坐标
      const lnglatArr = [];
      for (let i = 0; i < this.pointList.length; i++) {
        const lnglat = cartesianToLonlat(this.pointList[i]);
        lnglatArr.push(lnglat);
      }
      if (lnglatArr.length == 2) {
        lnglatArr.push([lnglatArr[1][0] + 0.0000001, lnglatArr[1][1]]);
      }
      const res = areaPlot.algorithm.getGatheringPlacePositions(lnglatArr);
      return new PolygonHierarchy(res);
    };
    return window.Viewer.entities.add({
      polygon: {
        hierarchy: new CallbackProperty(update, false),
        material: Color.BLUE,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}

export {
  Circle,
  Ellipse,
  Lune,
  Sector,
  Rectangle,
  ClosedCurve,
  Polygon,
  FreeHandPolygon,
  GatheringPlace,
};
