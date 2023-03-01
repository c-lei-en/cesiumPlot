import type { Cartesian3 } from "cesium";
import type { AllPlotI } from "../../interface";
import type { PointArr } from "../../interface";
import { P, lonLatToCartesian } from "../../tools";

const curseParams = {
  t: 0.3,
};
const gatheringPlaceParams = {
  t: 0.4,
};

export const areaPlot: AllPlotI = {
  version: "1.0.0",
  createTime: "2023-2-26",
  updateTime: "2023-2-26",
  author: "c-lei-en",
  algorithm: {
    // * 获取弓形坐标
    getArcPositions: (pnts: PointArr[]): Cartesian3[] => {
      let pnt;
      if (pnts.length == 2 || pnts[1].toString() == pnts[2].toString()) {
        const mid = P.PlotUtils.mid(pnts[0], pnts[1]);
        const d = P.PlotUtils.distance(pnts[0], mid);
        pnt = P.PlotUtils.getThirdPoint(pnts[0], mid, P.Constants.HALF_PI, d);
      }
      const pnt1 = pnts[0];
      const pnt2 = pnts[1];
      const pnt3 = pnt ? pnt : pnts[2];
      const center = P.PlotUtils.getCircleCenterOfThreePoints(pnt1, pnt2, pnt3);
      const radius = P.PlotUtils.distance(pnt1, center);
      const angle1 = P.PlotUtils.getAzimuth(pnt1, center);
      const angle2 = P.PlotUtils.getAzimuth(pnt2, center);
      let startAngle, endAngle;
      if (P.PlotUtils.isClockWise(pnt1, pnt2, pnt3)) {
        startAngle = angle2;
        endAngle = angle1;
      } else {
        startAngle = angle1;
        endAngle = angle2;
      }
      const pntArr = P.PlotUtils.getArcPoints(
        center,
        radius,
        startAngle,
        endAngle
      );
      return pntArr;
    },
    // * 获取扇形坐标
    getSectorPositions: (pnts: PointArr[]): Cartesian3[] => {
      const center = pnts[0];
      const radius = P.PlotUtils.distance(pnts[1], center);
      const startAngle = P.PlotUtils.getAzimuth(pnts[1], center);
      const endAngle = P.PlotUtils.getAzimuth(pnts[2], center);
      const pList = P.PlotUtils.getArcPoints(
        center,
        radius,
        startAngle,
        endAngle
      );
      pList.push(lonLatToCartesian(center), pList[0]);
      return pList;
    },
    // * 获取矩形坐标
    getRectanglePositions: (pnt1: PointArr, pnt2: PointArr): PointArr => {
      const xmin = Math.min(pnt1[0], pnt2[0]);
      const xmax = Math.max(pnt1[0], pnt2[0]);
      const ymin = Math.min(pnt1[1], pnt2[1]);
      const ymax = Math.max(pnt1[1], pnt2[1]);
      return [xmin, xmax, ymin, ymax];
    },
    // * 获取曲线面坐标
    getClosedCurvePositions: (pnts: PointArr[]): Cartesian3[] => {
      if (pnts.length == 2 || pnts[1].toString() == pnts[2].toString()) {
        const mid = P.PlotUtils.mid(pnts[0], pnts[1]);
        const d = P.PlotUtils.distance(pnts[0], mid);
        const pnt = P.PlotUtils.getThirdPoint(
          pnts[0],
          mid,
          P.Constants.HALF_PI,
          d
        );
        pnts.push(pnt);
      }
      pnts.push(pnts[0], pnts[1]);
      let normals: any = [];
      for (let i = 0; i < pnts.length - 2; i++) {
        const normalPoints = P.PlotUtils.getBisectorNormals(
          curseParams.t,
          pnts[i],
          pnts[i + 1],
          pnts[i + 2]
        );
        normals = normals.concat(normalPoints);
      }
      const count = normals.length;
      normals = [normals[count - 1]].concat(normals.slice(0, count - 1));

      const pList = [];
      for (let i = 0; i < pnts.length - 2; i++) {
        const pnt1 = pnts[i];
        const pnt2 = pnts[i + 1];
        pList.push(pnt1);
        for (let t = 0; t <= P.Constants.FITTING_COUNT; t++) {
          const pnt = P.PlotUtils.getCubicValue(
            t / P.Constants.FITTING_COUNT,
            pnt1,
            normals[i * 2],
            normals[i * 2 + 1],
            pnt2
          );
          pList.push(pnt);
        }
        pList.push(pnt2);
      }
      const cartesianList = [];
      for (let i = 0, len = pList.length; i < len - 1; i++) {
        cartesianList.push(lonLatToCartesian(pList[i]));
      }
      return cartesianList;
    },
    // * 获取聚集地坐标
    getGatheringPlacePositions: (pnts: PointArr[]) => {
      if (pnts.length == 2) {
        const mid = P.PlotUtils.mid(pnts[0], pnts[1]);
        const d = P.PlotUtils.distance(pnts[0], mid) / 0.9;
        const pnt = P.PlotUtils.getThirdPoint(
          pnts[0],
          mid,
          P.Constants.HALF_PI,
          d,
          true
        );
        pnts = [pnts[0], pnt, pnts[1]];
      }
      const mid = P.PlotUtils.mid(pnts[0], pnts[2]);
      pnts.push(mid, pnts[0], pnts[1]);

      let normals: any = [];
      for (let i = 0; i < pnts.length - 2; i++) {
        const pnt1 = pnts[i];
        const pnt2 = pnts[i + 1];
        const pnt3 = pnts[i + 2];
        const normalPoints = P.PlotUtils.getBisectorNormals(
          gatheringPlaceParams.t,
          pnt1,
          pnt2,
          pnt3
        );
        normals = normals.concat(normalPoints);
      }
      const count = normals.length;
      normals = [normals[count - 1]].concat(normals.slice(0, count - 1));
      const pList = [];
      for (let i = 0; i < pnts.length - 2; i++) {
        const pnt1 = pnts[i];
        const pnt2 = pnts[i + 1];
        pList.push(pnt1);
        for (let t = 0; t <= P.Constants.FITTING_COUNT; t++) {
          const pnt = P.PlotUtils.getCubicValue(
            t / P.Constants.FITTING_COUNT,
            pnt1,
            normals[i * 2],
            normals[i * 2 + 1],
            pnt2
          );
          pList.push(pnt);
        }
        pList.push(pnt2);
      }
      const cartesianList = [];
      for (let i = 0, len = pList.length; i < len - 1; i++) {
        cartesianList.push(lonLatToCartesian(pList[i]));
      }
      return cartesianList;
    },
  },
};
