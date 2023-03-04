import {
  BillboardCollection,
  defined,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from "cesium";
import { Marker } from "./graphicsDraw/pointDraw";
import {
  Arc,
  Curve,
  FreeHandPolyline,
  Polyline,
} from "./graphicsDraw/lineDraw";
import type { PlotClass } from "./interface";
import type { PointArr } from "./interface";
import emitter from "@/mitt";
import {
  Circle,
  ClosedCurve,
  Ellipse,
  FreeHandPolygon,
  GatheringPlace,
  Lune,
  Polygon,
  Rectangle,
  Sector,
} from "./graphicsDraw/areaDraw";
import {
  AssaultDirection,
  AttackArrow,
  DoubleArrow,
  FineArrow,
  SquadCombat,
  StraightArrow,
  TailedAttackArrow,
  TailedSquadCombat,
} from "./graphicsDraw/arrowDraw";

export default class PlotDraw {
  drawArr: Array<any>;
  handler: any;
  jsonData: any;
  nowObj: PlotClass | null;
  constructor() {
    this.drawArr = [];
    this.handler = null;
    this.nowObj = null;
    this.init();
  }
  init() {
    this.jsonData = {
      markerData: [],
      arcData: [],
      curveData: [],
      polylineData: [],
      freehandpolylineData: [],
      circleData: [],
      ellipseData: [],
      luneData: [],
      sectorData: [],
      rectangleData: [],
      closedcurveData: [],
      polygonData: [],
      freehandpolygonData: [],
      gatheringplaceData: [],
      doublearrowData: [],
      straightarrowData: [],
      finearrowData: [],
      assaultdirectionData: [],
      attackarrowData: [],
      tailedattackarrowData: [],
      squadcombatData: [],
      tailedsquadcombatData: [],
    };
    this.drawArr = [];
    emitter.on("drawEnd", () => {
      this.drawArr.push(this.nowObj);
      this.drawArr[this.drawArr.length - 1]?.stopDraw();
      this.saveData();
    });
    emitter.on("modifiedEnd", () => {
      this.startModified();
    });
    // * 将点位集合在此处创建，因为不论绘制/修改哪一个标绘都需要有移动点
    if (!window.Viewer.billboards)
      window.Viewer.billboards = window.Viewer.scene.primitives.add(
        new BillboardCollection({
          scene: window.Viewer.scene,
        })
      );
  }
  disable() {
    if (this.handler) {
      this.nowObj?.disable();
      this.nowObj = null;
      this.handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
      this.handler.destroy();
      this.handler = null;
    }
  }
  stopDraw() {
    this.drawArr[-1].stopDraw();
  }
  draw(type: string) {
    switch (type) {
      case "marker":
        this.nowObj = new Marker();
        this.nowObj.startDraw();
        break;
      case "arc":
        this.nowObj = new Arc();
        this.nowObj.startDraw();
        break;
      case "curve":
        this.nowObj = new Curve();
        this.nowObj.startDraw();
        break;
      case "polyline":
        this.nowObj = new Polyline();
        this.nowObj.startDraw();
        break;
      case "freeHandPolyline":
        this.nowObj = new FreeHandPolyline();
        this.nowObj.startDraw();
        break;
      case "circle":
        this.nowObj = new Circle();
        this.nowObj.startDraw();
        break;
      case "ellipse":
        this.nowObj = new Ellipse();
        this.nowObj.startDraw();
        break;
      case "lune":
        this.nowObj = new Lune();
        this.nowObj.startDraw();
        break;
      case "sector":
        this.nowObj = new Sector();
        this.nowObj.startDraw();
        break;
      case "rectangle":
        this.nowObj = new Rectangle();
        this.nowObj.startDraw();
        break;
      case "closedCurve":
        this.nowObj = new ClosedCurve();
        this.nowObj.startDraw();
        break;
      case "polygon":
        this.nowObj = new Polygon();
        this.nowObj.startDraw();
        break;
      case "freeHandPolygon":
        this.nowObj = new FreeHandPolygon();
        this.nowObj.startDraw();
        break;
      case "gatheringPlace":
        this.nowObj = new GatheringPlace();
        this.nowObj.startDraw();
        break;
      case "doubleArrow":
        this.nowObj = new DoubleArrow();
        this.nowObj.startDraw();
        break;
      case "straightArrow":
        this.nowObj = new StraightArrow();
        this.nowObj.startDraw();
        break;
      case "fineArrow":
        this.nowObj = new FineArrow();
        this.nowObj.startDraw();
        break;
      case "assaultDirection":
        this.nowObj = new AssaultDirection();
        this.nowObj.startDraw();
        break;
      case "attackArrow":
        this.nowObj = new AttackArrow();
        this.nowObj.startDraw();
        break;
      case "tailedAttackArrow":
        this.nowObj = new TailedAttackArrow();
        this.nowObj.startDraw();
        break;
      case "squadCombat":
        this.nowObj = new SquadCombat();
        this.nowObj.startDraw();
        break;
      case "tailedSquadCombat":
        this.nowObj = new TailedSquadCombat();
        this.nowObj.startDraw();
        break;
      default:
        break;
    }
  }
  saveData() {
    //保存用户数据
    const positions: PointArr = this.nowObj?.getLnglats() as PointArr;
    this.jsonData[this.nowObj?.type.toLowerCase() + "Data"].push(positions);
    console.log("保存的数据：", this.jsonData);
  }
  showData() {
    console.log(this.jsonData);
  }
  startModified() {
    const $this = this;
    this.handler = new ScreenSpaceEventHandler(window.Viewer.scene.canvas);
    // 单击选中开始编辑
    this.handler.setInputAction(function (evt: any) {
      const pick = window.Viewer.scene.pick(evt.position);
      if ($this.nowObj) {
        if ($this.nowObj.state != -1) {
          console.log("上一步操作未结束，请继续完成上一步！");
          return;
        }
        if (defined(pick) && pick.id) {
          for (let i = 0; i < $this.drawArr.length; i++) {
            if (pick.id == $this.drawArr[i].objId) {
              $this.nowObj = $this.drawArr[i];
              $this.drawArr[i].startModify();
              $this.endModify();
              break;
            }
          }
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
  }
  endModify() {
    this.handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
    this.handler.destroy();
    this.handler = null;
  }
  clearOne() {
    const $this = this;
    this.handler.setInputAction(function (evt: any) {
      //单机开始绘制
      const pick = window.Viewer.scene.pick(evt.position);
      if (defined(pick) && pick.id) {
        for (let i = 0; i < $this.drawArr.length; i++) {
          if (pick.id.objId == $this.drawArr[i].objId) {
            $this.drawArr[i].clear();
            $this.drawArr.splice(i, 1);
            break;
          }
        }
        $this.handler.destroy();
        $this.startModified();
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
  }
  clearAll() {
    for (let i = 0; i < this.drawArr.length; i++) {
      this.drawArr[i].clear();
    }
  }
}
