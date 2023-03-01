import type { AllPlotI } from "../../interface";
import type { PointArr } from "../../interface";
import { P } from "../../tools";

const curseParams = {
  t: 0.3,
};

export const linePlot: AllPlotI = {
  version: "1.0.0",
  createTime: "2023-2-13",
  updateTime: "2023-2-13",
  author: "c-lei-en",
  algorithm: {
    // * 获取弧线坐标
    getArcPositions: (
      pnt1: PointArr,
      pnt2: PointArr,
      pnt3: PointArr
    ): PointArr[] => {
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
      return P.PlotUtils.getArcPoints(center, radius, startAngle, endAngle);
    },
    // * 获取曲线坐标
    getCurvePoints: (controlPoints: Array<PointArr>): PointArr[] => {
      return P.PlotUtils.getCurvePoints(curseParams.t, controlPoints);
    },
  },
};
