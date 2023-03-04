import type { Primitive } from "cesium";
import type {
  Polygon,
  Circle,
  ClosedCurve,
  Ellipse,
  Lune,
  Rectangle,
  Sector,
  FreeHandPolygon,
  GatheringPlace,
} from "../graphicsDraw/areaDraw";
import type {
  Arc,
  Curve,
  FreeHandPolyline,
  Polyline,
} from "../graphicsDraw/lineDraw";
import type { Marker } from "../graphicsDraw/pointDraw";

export type PointArr = number[];

// * 所有类型的algorithm所遵守的接口
export interface AllPlotI {
  version: string;
  createTime: string;
  updateTime: string;
  author: string;
  algorithm: {
    [propsName: string]: any;
  };
}

// * 基础点类接口
export interface BasePointI {
  type: string;
  objId: number;
  handler: any;
  state: number; //state用于区分当前的状态 0 为删除 1为添加 2为编辑
  pointPrimitive: any;
  floatPoint: any;
  modifyHandler: any;
  pointList: any[];
}

// * 基础线类接口
export interface BaseLineI {
  type: string;
  objId: number;
  handler: any;
  state: number; //state用于区分当前的状态 0 为删除 1为添加 2为编辑
  step: number; // 表明选中了第几个点
  linePrimitive: any;
  lineEntity: any;
  floatPoint: any;
  floatPointArr: any[];
  modifyHandler: any;
  pointList: any[];
  outlineMaterial: any;
  selectPoint: any;
  clickStep: number;
}

// * 基础面类接口
export interface BaseAreaI {
  type: string;
  objId: number;
  handler: any;
  state: number; //state用于区分当前的状态 0 为删除 1为添加 2为编辑
  step: number; // 表明选中了第几个点
  areaPrimitive: any;
  areaEntity: any;
  floatPoint: any;
  floatPointArr: any[];
  modifyHandler: any;
  pointList: any[];
  material: any;
  selectPoint: any;
  clickStep: number;
}

// * 基础箭头类接口
export interface BaseArrowI {
  type: string;
  objId: number;
  handler: any;
  state: number; //state用于区分当前的状态 0 为删除 1为添加 2为编辑
  step: number; // 表明选中了第几个点
  arrowPrimitive: any;
  arrowEntity: any;
  floatPoint: any;
  floatPointArr: any[];
  modifyHandler: any;
  pointList: any[];
  material: any;
  selectPoint: any;
  clickStep: number;
}

// * 所有绘制类型所需要遵守实现的函数
export interface PlotFuncI {
  // * 退出绘制
  disable: () => void;
  // * 销毁当前的绘制事件
  stopDraw: () => void;
  // * 开始绘制
  startDraw: () => void;
  // * 开始编辑
  startModify: () => void;
  // * 通过数据创建要素
  createByData: (data: any) => void;
  // * 获取当前要素的经纬度
  getLnglats: () => any;
  // * 获取当前要素的坐标
  getPositions: () => any;
  // * 创建点
  creatPoint: (cartesian: PointArr) => Primitive;
  // * 将实体对象添加进界面显示
  showPrimitiveOnMap: (positons: any) => Primitive;
}

export interface PlotI {
  version: string;
  Constants: {
    TWO_PI: number;
    HALF_PI: number;
    FITTING_COUNT: number;
    ZERO_TOLERANCE: number;
  };
  PlotUtils: {
    distance: Function;
    wholeDistance: Function;
    getBaseLength: Function;
    mid: Function;
    getCircleCenterOfThreePoints: Function;
    getIntersectPoint: Function;
    getAzimuth: Function;
    getAngleOfThreePoints: Function;
    isClockWise: Function;
    getPointOnLine: Function;
    getCubicValue: Function;
    getThirdPoint: Function;
    getArcPoints: Function;
    getBisectorNormals: Function;
    getNormal: Function;
    getCurvePoints: Function;
    getLeftMostControlPoint: Function;
    getRightMostControlPoint: Function;
    getBezierPoints: Function;
    getBinomialFactor: Function;
    getFactorial: Function;
    getQBSplinePoints: Function;
    getQuadricBSplineFactor: Function;
  };
}

// * 定义所有绘制类型
export type PlotClass =
  | Marker
  | Arc
  | Curve
  | Polyline
  | FreeHandPolyline
  | Circle
  | Ellipse
  | Lune
  | Sector
  | Rectangle
  | ClosedCurve
  | Polygon
  | FreeHandPolygon
  | GatheringPlace;
