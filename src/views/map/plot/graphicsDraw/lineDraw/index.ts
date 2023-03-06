import {
  Billboard,
  CallbackProperty,
  Color,
  defined,
  Entity,
  GeometryInstance,
  GroundPolylineGeometry,
  GroundPolylinePrimitive,
  HeightReference,
  Material,
  PolylineGraphics,
  PolylineMaterialAppearance,
  Primitive,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
} from "cesium";
import { getCatesian3FromPX, cartesianToLonlat } from "../../tools";
import type { BaseLineI, PlotFuncI, PointArr } from "./../../interface/index";
import { linePlot } from "./algorithm";
import emitter from "@/mitt";

class BaseLine implements BaseLineI {
  type: string;
  objId: number;
  handler: any;
  state: number;
  step: number;
  floatPoint: any;
  floatPointArr: any;
  linePrimitive: any;
  lineEntity: any;
  modifyHandler: any;
  pointList: any[];
  outlineMaterial: any;
  selectPoint: any;
  clickStep: number;
  constructor(obj: BaseLineI) {
    this.type = obj.type;
    this.objId = obj.objId;
    this.handler = obj.handler;
    this.linePrimitive = obj.linePrimitive;
    this.lineEntity = obj.lineEntity;
    this.state = obj.state; //state用于区分当前的状态 0 为删除 1为添加 2为编辑
    this.step = obj.step;
    this.floatPoint = obj.floatPoint;
    this.floatPointArr = obj.floatPointArr;
    this.modifyHandler = obj.modifyHandler;
    this.pointList = obj.pointList;
    this.outlineMaterial = obj.outlineMaterial;
    this.selectPoint = obj.selectPoint;
    this.clickStep = obj.clickStep;
  }
  disable() {
    if (this.linePrimitive) {
      window.Viewer.entities.remove(this.lineEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.lineEntity = null;
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

// * arc 弧线
class Arc extends BaseLine implements PlotFuncI {
  constructor() {
    super({
      type: "Arc",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      linePrimitive: null,
      lineEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      outlineMaterial: Material.fromType("PolylineOutline", {
        outlineWidth: 5,
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
        this.linePrimitive = this.showPrimitiveOnMap();
        window.Viewer.entities.remove(this.lineEntity);
        window.Viewer.billboards.remove(this.floatPoint);
        this.lineEntity = null;
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
      if (this.pointList.length == 2 && !this.lineEntity) {
        this.lineEntity = this.createEntity();
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
    this.lineEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.linePrimitive);
    this.linePrimitive = null;

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
          this.linePrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.lineEntity);
          this.lineEntity = null;
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
    this.linePrimitive = this.showPrimitiveOnMap();
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

  showPrimitiveOnMap(): Primitive {
    const lnglatArr = [];
    for (let i = 0; i < this.pointList.length; i++) {
      const lnglat = cartesianToLonlat(this.pointList[i]);
      lnglatArr.push(lnglat);
    }
    const res = linePlot.algorithm.getArcPositions(...lnglatArr);
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new GroundPolylineGeometry({
        positions: res,
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPolylinePrimitive({
        geometryInstances: instance,
        appearance: new PolylineMaterialAppearance({
          material: this.outlineMaterial,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      // * 计算曲线，若有两个点则应该直接返回两个点的连线，若有三个点则返回处理后的坐标集合
      if (this.pointList.length == 2) {
        return this.pointList;
      } else if (this.pointList.length == 3) {
        if (
          JSON.stringify(this.pointList[2]) == JSON.stringify(this.pointList[1])
        ) {
          return this.pointList;
        }
        const lnglatArr = [];
        for (let i = 0; i < this.pointList.length; i++) {
          const lnglat = cartesianToLonlat(this.pointList[i]);
          lnglatArr.push(lnglat);
        }
        const res = linePlot.algorithm.getArcPositions(...lnglatArr);
        const index = JSON.stringify(res).indexOf("null");
        let returnData = [];
        if (index == -1) returnData = res;
        return returnData;
      } else {
        return [];
      }
    };
    return window.Viewer.entities.add({
      polyline: new PolylineGraphics({
        positions: new CallbackProperty(update, false),
        show: true,
        material: Color.BLUE,
        clampToGround: true,
      }),
    });
  }
}

// * 曲线
class Curve extends BaseLine implements PlotFuncI {
  constructor() {
    super({
      type: "Curve",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      linePrimitive: null,
      lineEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      outlineMaterial: Material.fromType("PolylineOutline", {
        outlineWidth: 5,
      }),
      selectPoint: null,
      clickStep: 0,
    });
  }

  startDraw() {
    this.state = 1;
    // * 单击开始绘制
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
      if (this.pointList.length == 2 && !this.lineEntity) {
        this.lineEntity = this.createEntity();
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
      if (this.pointList.length < 2) return;
      this.state = -1;
      this.linePrimitive = this.showPrimitiveOnMap();
      window.Viewer.entities.remove(this.lineEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.lineEntity = null;
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
    this.lineEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.linePrimitive);
    this.linePrimitive = null;

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
          this.linePrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.lineEntity);
          this.lineEntity = null;
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
    this.linePrimitive = this.showPrimitiveOnMap();
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
  showPrimitiveOnMap(): Primitive {
    let res;
    if (this.pointList.length == 2) {
      res = this.pointList;
    } else {
      const lnglatArr = [];
      for (let i = 0; i < this.pointList.length; i++) {
        const lnglat = cartesianToLonlat(this.pointList[i]);
        lnglatArr.push(lnglat);
      }
      res = linePlot.algorithm.getCurvePoints(lnglatArr);
    }
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new GroundPolylineGeometry({
        positions: res,
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPolylinePrimitive({
        geometryInstances: instance,
        appearance: new PolylineMaterialAppearance({
          material: this.outlineMaterial,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      // * 计算曲线，若有两个点则应该直接返回两个点的连线，若有三个点则返回处理后的坐标集合
      if (this.pointList.length == 2) {
        return this.pointList;
      } else {
        const lnglatArr = [];
        for (let i = 0; i < this.pointList.length; i++) {
          const lnglat = cartesianToLonlat(this.pointList[i]);
          lnglatArr.push(lnglat);
        }
        const res = linePlot.algorithm.getCurvePoints(lnglatArr);
        const index = JSON.stringify(res).indexOf("null");
        let returnData = [];
        if (index == -1) returnData = res;
        return returnData;
      }
    };
    return window.Viewer.entities.add({
      polyline: new PolylineGraphics({
        positions: new CallbackProperty(update, false),
        show: true,
        material: Color.BLUE,
        clampToGround: true,
      }),
    });
  }
}

// * 折线
class Polyline extends BaseLine implements PlotFuncI {
  constructor() {
    super({
      type: "Polyline",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      linePrimitive: null,
      lineEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      outlineMaterial: Material.fromType("PolylineOutline", {
        outlineWidth: 5,
      }),
      selectPoint: null,
      clickStep: 0,
    });
  }

  startDraw() {
    this.state = 1;
    // * 单击开始绘制
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
      if (this.pointList.length == 2 && !this.lineEntity) {
        this.lineEntity = this.createEntity();
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
      if (this.pointList.length < 2) return;
      this.state = -1;
      this.linePrimitive = this.showPrimitiveOnMap();
      window.Viewer.entities.remove(this.lineEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.lineEntity = null;
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
    this.lineEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.linePrimitive);
    this.linePrimitive = null;

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
          this.linePrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.lineEntity);
          this.lineEntity = null;
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
    this.linePrimitive = this.showPrimitiveOnMap();
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
  showPrimitiveOnMap(): Primitive {
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new GroundPolylineGeometry({
        positions: this.pointList,
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPolylinePrimitive({
        geometryInstances: instance,
        appearance: new PolylineMaterialAppearance({
          material: this.outlineMaterial,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      // * 计算曲线，若有两个点则应该直接返回两个点的连线，若有三个点则返回处理后的坐标集合
      return this.pointList;
    };
    return window.Viewer.entities.add({
      polyline: new PolylineGraphics({
        positions: new CallbackProperty(update, false),
        show: true,
        material: Color.BLUE,
        clampToGround: true,
      }),
    });
  }
}

// * 自由线
class FreeHandPolyline extends BaseLine implements PlotFuncI {
  constructor() {
    super({
      type: "FreeHandPolyline",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      linePrimitive: null,
      lineEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      outlineMaterial: Material.fromType("PolylineOutline", {
        outlineWidth: 5,
      }),
      selectPoint: null,
      clickStep: 0,
    });
  }

  startDraw() {
    this.state = 1;
    // * 单击开始绘制
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
      if (this.pointList.length == 2 && !this.lineEntity) {
        this.lineEntity = this.createEntity();
      } else if (this.pointList.length >= 2) {
        // * 随着鼠标移动添加数据
        this.pointList.push(cartesian.clone());
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
    // * 鼠标右击完成绘制
    this.handler.setInputAction(() => {
      if (this.pointList.length < 2) return;
      this.state = -1;
      this.linePrimitive = this.showPrimitiveOnMap();
      window.Viewer.entities.remove(this.lineEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.lineEntity = null;
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
    this.lineEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.linePrimitive);
    this.linePrimitive = null;

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
          this.linePrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.lineEntity);
          this.lineEntity = null;
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
    this.linePrimitive = this.showPrimitiveOnMap();
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
  showPrimitiveOnMap(): Primitive {
    const instance = new GeometryInstance({
      id: this.objId,
      geometry: new GroundPolylineGeometry({
        positions: this.pointList,
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPolylinePrimitive({
        geometryInstances: instance,
        appearance: new PolylineMaterialAppearance({
          material: this.outlineMaterial,
        }),
      })
    );
  }
  // * 创建中间entity以适应动态数据
  createEntity(): Entity {
    const update = () => {
      // * 计算曲线，若有两个点则应该直接返回两个点的连线，若有三个点则返回处理后的坐标集合
      return this.pointList;
    };
    return window.Viewer.entities.add({
      polyline: new PolylineGraphics({
        positions: new CallbackProperty(update, false),
        show: true,
        material: Color.BLUE,
        clampToGround: true,
      }),
    });
  }
}

export { Arc, Curve, Polyline, FreeHandPolyline };
