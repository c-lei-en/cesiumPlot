import {
  Appearance,
  Billboard,
  CallbackProperty,
  Color,
  defined,
  Entity,
  GeometryInstance,
  GroundPrimitive,
  HeightReference,
  Material,
  Primitive,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  PolygonGeometry,
  PolygonHierarchy,
  GroundPolylineGeometry,
  GroundPolylinePrimitive,
  PolylineMaterialAppearance,
  PolylineArrowMaterialProperty,
} from "cesium";
import { getCatesian3FromPX, cartesianToLonlat } from "../../tools";
import type { BaseArrowI, PlotFuncI, PointArr } from "./../../interface";
import { arrowPlot } from "./algorithm";
import emitter from "@/mitt";

class BaseArrow implements BaseArrowI {
  type: string;
  baseType: string;
  objId: number;
  handler: any;
  state: number;
  step: number;
  floatPoint: any;
  floatPointArr: any;
  arrowPrimitive: any;
  arrowEntity: any;
  modifyHandler: any;
  pointList: any[];
  material: any;
  selectPoint: any;
  clickStep: number;
  constructor(obj: BaseArrowI) {
    this.type = obj.type;
    this.baseType = "arrow";
    this.objId = obj.objId;
    this.handler = obj.handler;
    this.arrowPrimitive = obj.arrowPrimitive;
    this.arrowEntity = obj.arrowEntity;
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
    if (this.arrowEntity) {
      window.Viewer.entities.remove(this.arrowEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.floatPointArr.forEach((item: Billboard) => {
        window.Viewer.billboards.remove(item);
      });
      this.arrowEntity = null;
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

// * doubleArrow 钳击
class DoubleArrow extends BaseArrow implements PlotFuncI {
  constructor() {
    super({
      type: "DoubleArrow",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      arrowPrimitive: null,
      arrowEntity: null,
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
      if (this.pointList.length == 5) {
        this.state = -1;
        this.pointList.pop();
        this.arrowPrimitive = this.showPrimitiveOnMap();
        window.Viewer.entities.remove(this.arrowEntity);
        window.Viewer.billboards.remove(this.floatPoint);
        this.arrowEntity = null;
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
      if (this.pointList.length == 2 && !this.arrowEntity) {
        this.arrowEntity = this.createEntity();
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
    this.arrowEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.arrowPrimitive);
    this.arrowPrimitive = null;

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
          this.arrowPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.arrowEntity);
          this.arrowEntity = null;
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
    this.arrowPrimitive = this.showPrimitiveOnMap();
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
          arrowPlot.algorithm.getDoubleArrow(lnglatArr)
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
      if (
        lnglatArr.length == 2 ||
        lnglatArr[1].toString() == lnglatArr[2].toString()
      ) {
        lnglatArr.push([lnglatArr[1][0] + 0.0000001, lnglatArr[1][1]]);
      }
      const res = arrowPlot.algorithm.getDoubleArrow(lnglatArr);
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

// * straightArrow 直箭头
class StraightArrow extends BaseArrow implements PlotFuncI {
  constructor() {
    super({
      type: "StraightArrow",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      arrowPrimitive: null,
      arrowEntity: null,
      floatPoint: null,
      floatPointArr: [],
      modifyHandler: null,
      pointList: [],
      material: Material.fromType("PolylineArrow", {
        color: Color.PINK.clone(),
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
      if (this.pointList.length == 2 && !this.arrowEntity) {
        this.arrowEntity = this.createEntity();
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
      this.pointList.pop();
      this.arrowPrimitive = this.showPrimitiveOnMap();
      window.Viewer.entities.remove(this.arrowEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.arrowEntity = null;
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
    this.arrowEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.arrowPrimitive);
    this.arrowPrimitive = null;

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
          this.arrowPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.arrowEntity);
          this.arrowEntity = null;
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
    this.arrowPrimitive = this.showPrimitiveOnMap();
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
        width: 10,
      }),
    });

    return window.Viewer.scene.groundPrimitives.add(
      new GroundPolylinePrimitive({
        geometryInstances: instance,
        appearance: new PolylineMaterialAppearance({
          material: this.material,
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
      polyline: {
        positions: new CallbackProperty(update, false),
        show: true,
        width: 10,
        material: new PolylineArrowMaterialProperty(Color.BLUE.clone()),
        clampToGround: true,
      },
    });
  }
}

// * fineArrow 细直箭头
class FineArrow extends BaseArrow implements PlotFuncI {
  constructor() {
    super({
      type: "FineArrow",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      arrowPrimitive: null,
      arrowEntity: null,
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
        this.arrowPrimitive = this.showPrimitiveOnMap();
        window.Viewer.entities.remove(this.arrowEntity);
        window.Viewer.billboards.remove(this.floatPoint);
        this.arrowEntity = null;
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
      if (this.pointList.length == 2 && !this.arrowEntity) {
        this.arrowEntity = this.createEntity();
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
    this.arrowEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.arrowPrimitive);
    this.arrowPrimitive = null;

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
          this.arrowPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.arrowEntity);
          this.arrowEntity = null;
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
    this.arrowPrimitive = this.showPrimitiveOnMap();
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
          arrowPlot.algorithm.getFineArrow(lnglatArr)
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
      const res = arrowPlot.algorithm.getFineArrow(lnglatArr);
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

// * assaultDirection 突击方向
class AssaultDirection extends BaseArrow implements PlotFuncI {
  constructor() {
    super({
      type: "AssaultDirection",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      arrowPrimitive: null,
      arrowEntity: null,
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
        this.arrowPrimitive = this.showPrimitiveOnMap();
        window.Viewer.entities.remove(this.arrowEntity);
        window.Viewer.billboards.remove(this.floatPoint);
        this.arrowEntity = null;
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
      if (this.pointList.length == 2 && !this.arrowEntity) {
        this.arrowEntity = this.createEntity();
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
    this.arrowEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.arrowPrimitive);
    this.arrowPrimitive = null;

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
          this.arrowPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.arrowEntity);
          this.arrowEntity = null;
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
    this.arrowPrimitive = this.showPrimitiveOnMap();
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
          arrowPlot.algorithm.getAssaultDirection(lnglatArr)
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
      const res = arrowPlot.algorithm.getAssaultDirection(lnglatArr);
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

// * attackArrow 进攻方向
class AttackArrow extends BaseArrow implements PlotFuncI {
  constructor() {
    super({
      type: "AttackArrow",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      arrowPrimitive: null,
      arrowEntity: null,
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
      if (this.pointList.length == 2 && !this.arrowEntity) {
        this.arrowEntity = this.createEntity();
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
      this.pointList.pop();
      this.arrowPrimitive = this.showPrimitiveOnMap();
      window.Viewer.entities.remove(this.arrowEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.arrowEntity = null;
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
    this.arrowEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.arrowPrimitive);
    this.arrowPrimitive = null;

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
          this.arrowPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.arrowEntity);
          this.arrowEntity = null;
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
    this.arrowPrimitive = this.showPrimitiveOnMap();
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
          arrowPlot.algorithm.getAttackArrow(lnglatArr)
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
      } else if (
        lnglatArr[lnglatArr.length - 1].toString() ==
          lnglatArr[lnglatArr.length - 2].toString() &&
        lnglatArr.length > 3
      ) {
        lnglatArr.pop();
      } else {
        lnglatArr[lnglatArr.length - 1][0] += 0.0000001;
      }
      const res = arrowPlot.algorithm.getAttackArrow(lnglatArr);
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

// * tailedAttackArrow 进攻方向（尾）
class TailedAttackArrow extends BaseArrow implements PlotFuncI {
  constructor() {
    super({
      type: "TailedAttackArrow",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      arrowPrimitive: null,
      arrowEntity: null,
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
      if (this.pointList.length == 2 && !this.arrowEntity) {
        this.arrowEntity = this.createEntity();
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
      this.pointList.pop();
      this.arrowPrimitive = this.showPrimitiveOnMap();
      window.Viewer.entities.remove(this.arrowEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.arrowEntity = null;
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
    this.arrowEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.arrowPrimitive);
    this.arrowPrimitive = null;

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
          this.arrowPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.arrowEntity);
          this.arrowEntity = null;
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
    this.arrowPrimitive = this.showPrimitiveOnMap();
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
          arrowPlot.algorithm.getTailedAttackArrow(lnglatArr)
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
      } else if (
        lnglatArr[lnglatArr.length - 1].toString() ==
          lnglatArr[lnglatArr.length - 2].toString() &&
        lnglatArr.length > 3
      ) {
        lnglatArr.pop();
      } else {
        lnglatArr[lnglatArr.length - 1][0] += 0.0000001;
      }
      const res = arrowPlot.algorithm.getTailedAttackArrow(lnglatArr);
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

// * squadCombat 分队战斗行动
class SquadCombat extends BaseArrow implements PlotFuncI {
  constructor() {
    super({
      type: "SquadCombat",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      arrowPrimitive: null,
      arrowEntity: null,
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
      if (this.pointList.length == 2 && !this.arrowEntity) {
        this.arrowEntity = this.createEntity();
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
      this.pointList.pop();
      this.arrowPrimitive = this.showPrimitiveOnMap();
      window.Viewer.entities.remove(this.arrowEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.arrowEntity = null;
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
    this.arrowEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.arrowPrimitive);
    this.arrowPrimitive = null;

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
          this.arrowPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.arrowEntity);
          this.arrowEntity = null;
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
    this.arrowPrimitive = this.showPrimitiveOnMap();
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
          arrowPlot.algorithm.getSquadCombat(lnglatArr)
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
      } else if (
        lnglatArr[lnglatArr.length - 1].toString() ==
          lnglatArr[lnglatArr.length - 2].toString() &&
        lnglatArr.length > 3
      ) {
        lnglatArr.pop();
      } else {
        lnglatArr[lnglatArr.length - 1][0] += 0.0000001;
      }
      const res = arrowPlot.algorithm.getSquadCombat(lnglatArr);
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

// * tailedSquadCombat 分队战斗行动（尾）
class TailedSquadCombat extends BaseArrow implements PlotFuncI {
  constructor() {
    super({
      type: "TailedSquadCombat",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      step: -1,
      arrowPrimitive: null,
      arrowEntity: null,
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
      if (this.pointList.length == 2 && !this.arrowEntity) {
        this.arrowEntity = this.createEntity();
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
      this.pointList.pop();
      this.arrowPrimitive = this.showPrimitiveOnMap();
      window.Viewer.entities.remove(this.arrowEntity);
      window.Viewer.billboards.remove(this.floatPoint);
      this.arrowEntity = null;
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
    this.arrowEntity = this.createEntity();
    window.Viewer.scene.groundPrimitives.remove(this.arrowPrimitive);
    this.arrowPrimitive = null;

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
          this.arrowPrimitive = this.showPrimitiveOnMap();
          window.Viewer.entities.remove(this.arrowEntity);
          this.arrowEntity = null;
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
    this.arrowPrimitive = this.showPrimitiveOnMap();
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
          arrowPlot.algorithm.getTailedSquadCombat(lnglatArr)
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
      } else if (
        lnglatArr[lnglatArr.length - 1].toString() ==
          lnglatArr[lnglatArr.length - 2].toString() &&
        lnglatArr.length > 3
      ) {
        lnglatArr.pop();
      } else {
        lnglatArr[lnglatArr.length - 1][0] += 0.0000001;
      }
      const res = arrowPlot.algorithm.getTailedSquadCombat(lnglatArr);
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
  DoubleArrow,
  StraightArrow,
  FineArrow,
  AssaultDirection,
  AttackArrow,
  TailedAttackArrow,
  SquadCombat,
  TailedSquadCombat,
};
