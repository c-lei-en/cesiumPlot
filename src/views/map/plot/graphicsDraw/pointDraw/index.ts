import {
  Cartesian3,
  HeightReference,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
} from "cesium";
import type { PlotFuncI, PointArr, BasePointI } from "../../interface";
import { getCatesian3FromPX, cartesianToLonlat } from "../../tools";
import emitter from "@/mitt";

class BasePoint implements BasePointI {
  type: string;
  baseType: string;
  objId: number;
  handler: any;
  state: number; //state用于区分当前的状态 0 为删除 1为添加 2为编辑
  floatPoint: any;
  pointPrimitive: any;
  modifyHandler: any;
  pointList: any[];
  constructor(obj: BasePointI) {
    this.type = obj.type;
    this.baseType = "point";
    this.objId = obj.objId;
    this.handler = obj.handler;
    this.pointPrimitive = obj.pointPrimitive;
    this.state = obj.state; //state用于区分当前的状态 0 为删除 1为添加 2为编辑
    this.floatPoint = obj.floatPoint;
    this.modifyHandler = obj.modifyHandler;
    this.pointList = obj.pointList;
  }
}

// * marker广告牌
class Marker extends BasePoint implements PlotFuncI {
  constructor() {
    super({
      type: "Marker",
      objId: Number(
        new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
      ),
      handler: new ScreenSpaceEventHandler(window.Viewer.scene.canvas),
      state: -1,
      pointPrimitive: null,
      floatPoint: null,
      modifyHandler: null,
      pointList: [],
    });
  }
  disable() {
    if (this.pointPrimitive) {
      window.Viewer.billboards.remove(this.pointPrimitive);
      window.Viewer.billboards.remove(this.floatPoint);
      this.pointPrimitive = null;
    }
    this.state = -1;
    this.stopDraw();
  }
  stopDraw() {
    if (this.handler) {
      this.handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
      this.handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
      this.handler.destroy();
      this.handler = null;
    }
    if (this.modifyHandler) {
      this.modifyHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
      this.modifyHandler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
      this.modifyHandler.destroy();
      this.modifyHandler = null;
    }
  }
  startDraw() {
    this.state = 1;
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.position);
      if (!cartesian) return;
      this.state = -1;
      this.pointList.push(cartesian);
      this.pointPrimitive = this.showPrimitiveOnMap(cartesian);
      this.floatPoint.show = false;
      this.stopDraw();
      emitter.emit("drawEnd");
    }, ScreenSpaceEventType.LEFT_CLICK);
    this.handler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!cartesian) return;
      if (this.floatPoint) this.floatPoint.position = cartesian;
      else this.floatPoint = this.creatPoint(cartesian);
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  startModify() {
    if (!this.modifyHandler)
      this.modifyHandler = new ScreenSpaceEventHandler(
        window.Viewer.scene.canvas
      );
    this.state = 2;
    this.floatPoint.show = true;
    this.modifyHandler.setInputAction((evt: any) => {
      this.floatPoint.show = false;
      this.state = -1;
      this.pointPrimitive.position = getCatesian3FromPX(evt.position);
      this.stopDraw();
      emitter.emit("modifiedEnd");
    }, ScreenSpaceEventType.LEFT_CLICK);
    this.modifyHandler.setInputAction((evt: any) => {
      const cartesian = getCatesian3FromPX(evt.endPosition);
      if (!cartesian) return;
      if (this.floatPoint) {
        this.floatPoint.position = cartesian;
        this.pointList = cartesian;
      } else {
        return;
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }
  createByData(data: PointArr) {
    this.pointList = [];
    this.state = -1;
    this.floatPoint = null;
    this.modifyHandler = null;
    this.pointList = Cartesian3.fromDegreesArray(data);
    this.pointPrimitive = this.showPrimitiveOnMap(this.pointList);
    this.pointPrimitive.objId = this.objId;
  }
  getLnglats() {
    return cartesianToLonlat(this.pointList[0]);
  }
  getPositions() {
    return this.pointList;
  }
  creatPoint(cartesian: PointArr) {
    return window.Viewer.billboards.add({
      position: cartesian,
      image: "/src/assets/icon/point.png",
      verticalOrigin: VerticalOrigin.BOTTOM,
      heightReference: HeightReference.CLAMP_TO_GROUND,
    });
  }
  showPrimitiveOnMap(positons: PointArr[]) {
    return window.Viewer.billboards.add({
      position: positons,
      id: this.objId,
      image: "/src/assets/icon/mark.png",
      verticalOrigin: VerticalOrigin.BOTTOM,
      heightReference: HeightReference.CLAMP_TO_GROUND,
    });
  }
}

export { Marker };
