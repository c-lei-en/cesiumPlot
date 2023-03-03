import type { Cartesian3 } from "cesium";
import type { AllPlotI } from "../../interface";
import type { PointArr } from "../../interface";
import { P, lonLatToCartesian } from "../../tools";

const doubleArrowParams = {
  headHeightFactor: 0.25,
  headWidthFactor: 0.3,
  neckHeightFactor: 0.85,
  neckWidthFactor: 0.15,
};

// * 细直箭头与突击方向type
type FineOrAssault = {
  tailWidthFactor: number;
  neckWidthFactor: number;
  headWidthFactor: number;
  headAngle: number;
  neckAngle: number;
};

const fineArrowParams: FineOrAssault = {
  tailWidthFactor: 0.15,
  neckWidthFactor: 0.2,
  headWidthFactor: 0.25,
  headAngle: Math.PI / 8.5,
  neckAngle: Math.PI / 13,
};

const assaultDirectionParams: FineOrAssault = {
  tailWidthFactor: 0.2,
  neckWidthFactor: 0.25,
  headWidthFactor: 0.3,
  headAngle: Math.PI / 4,
  neckAngle: Math.PI * 0.17741,
};

const attackArrowParams = {
  headHeightFactor: 0.18,
  headWidthFactor: 0.3,
  neckHeightFactor: 0.85,
  neckWidthFactor: 0.15,
  headTailFactor: 0.8,
  tailWidthFactor: 0.1,
  swallowTailFactor: 1,
};

const squadCombatParams = {
  headHeightFactor: 0.18,
  headWidthFactor: 0.3,
  neckHeightFactor: 0.85,
  neckWidthFactor: 0.15,
  tailWidthFactor: 0.1,
  swallowTailFactor: 1,
};

export const arrowPlot: AllPlotI = {
  version: "1.0.0",
  createTime: "2023-3-3",
  updateTime: "2023-3-3",
  author: "c-lei-en",
  algorithm: {
    // * 计算对称点
    getTempPoint4: (
      pnt1: PointArr,
      pnt2: PointArr,
      point: PointArr
    ): PointArr => {
      const midPnt = P.PlotUtils.mid(pnt1, pnt2);
      const len = P.PlotUtils.distance(midPnt, point);
      const angle = P.PlotUtils.getAngleOfThreePoints(pnt1, midPnt, point);
      let symPnt, distance1, distance2, mid;
      if (angle < P.Constants.HALF_PI) {
        distance1 = len * Math.sin(angle);
        distance2 = len * Math.cos(angle);
        mid = P.PlotUtils.getThirdPoint(
          pnt1,
          midPnt,
          P.Constants.HALF_PI,
          distance1,
          false
        );
        symPnt = P.PlotUtils.getThirdPoint(
          midPnt,
          mid,
          P.Constants.HALF_PI,
          distance2,
          true
        );
      } else if (angle >= P.Constants.HALF_PI && angle < Math.PI) {
        distance1 = len * Math.sin(Math.PI - angle);
        distance2 = len * Math.cos(Math.PI - angle);
        mid = P.PlotUtils.getThirdPoint(
          pnt1,
          midPnt,
          P.Constants.HALF_PI,
          distance1,
          false
        );
        symPnt = P.PlotUtils.getThirdPoint(
          midPnt,
          mid,
          P.Constants.HALF_PI,
          distance2,
          false
        );
      } else if (angle >= Math.PI && angle < Math.PI * 1.5) {
        distance1 = len * Math.sin(angle - Math.PI);
        distance2 = len * Math.cos(angle - Math.PI);
        mid = P.PlotUtils.getThirdPoint(
          pnt1,
          midPnt,
          P.Constants.HALF_PI,
          distance1,
          true
        );
        symPnt = P.PlotUtils.getThirdPoint(
          midPnt,
          mid,
          P.Constants.HALF_PI,
          distance2,
          true
        );
      } else {
        distance1 = len * Math.sin(Math.PI * 2 - angle);
        distance2 = len * Math.cos(Math.PI * 2 - angle);
        mid = P.PlotUtils.getThirdPoint(
          pnt1,
          midPnt,
          P.Constants.HALF_PI,
          distance1,
          true
        );
        symPnt = P.PlotUtils.getThirdPoint(
          midPnt,
          mid,
          P.Constants.HALF_PI,
          distance2,
          false
        );
      }
      return symPnt;
    },
    // * 获取箭头坐标
    getArrowHeadPoints: (points: PointArr): PointArr => {
      const len = P.PlotUtils.getBaseLength(points);
      const headHeight = len * doubleArrowParams.headHeightFactor;
      const headPnt = points[points.length - 1];
      const headWidth = headHeight * doubleArrowParams.headWidthFactor;
      const neckWidth = headHeight * doubleArrowParams.neckWidthFactor;
      const neckHeight = headHeight * doubleArrowParams.neckHeightFactor;
      const headEndPnt = P.PlotUtils.getThirdPoint(
        points[points.length - 2],
        headPnt,
        0,
        headHeight,
        true
      );
      const neckEndPnt = P.PlotUtils.getThirdPoint(
        points[points.length - 2],
        headPnt,
        0,
        neckHeight,
        true
      );
      const headLeft = P.PlotUtils.getThirdPoint(
        headPnt,
        headEndPnt,
        P.Constants.HALF_PI,
        headWidth,
        false
      );
      const headRight = P.PlotUtils.getThirdPoint(
        headPnt,
        headEndPnt,
        P.Constants.HALF_PI,
        headWidth,
        true
      );
      const neckLeft = P.PlotUtils.getThirdPoint(
        headPnt,
        neckEndPnt,
        P.Constants.HALF_PI,
        neckWidth,
        false
      );
      const neckRight = P.PlotUtils.getThirdPoint(
        headPnt,
        neckEndPnt,
        P.Constants.HALF_PI,
        neckWidth,
        true
      );
      return [neckLeft, headLeft, headPnt, headRight, neckRight];
    },
    // * 获取钳击箭身坐标
    getArrowBodyPoints: (
      points: PointArr,
      neckLeft: PointArr,
      neckRight: PointArr,
      tailWidthFactor: number
    ): PointArr => {
      const allLen = P.PlotUtils.wholeDistance(points);
      const len = P.PlotUtils.getBaseLength(points);
      const tailWidth = len * tailWidthFactor;
      const neckWidth = P.PlotUtils.distance(neckLeft, neckRight);
      const widthDif = (tailWidth - neckWidth) / 2;
      let tempLen = 0;
      const leftBodyPnts = [],
        rightBodyPnts = [];
      for (let i = 1; i < points.length - 1; i++) {
        const angle =
          P.PlotUtils.getAngleOfThreePoints(
            points[i - 1],
            points[i],
            points[i + 1]
          ) / 2;
        tempLen += P.PlotUtils.distance(points[i - 1], points[i]);
        const w =
          (tailWidth / 2 - (tempLen / allLen) * widthDif) / Math.sin(angle);
        const left = P.PlotUtils.getThirdPoint(
          points[i - 1],
          points[i],
          Math.PI - angle,
          w,
          true
        );
        const right = P.PlotUtils.getThirdPoint(
          points[i - 1],
          points[i],
          angle,
          w,
          false
        );
        leftBodyPnts.push(left);
        rightBodyPnts.push(right);
      }
      return leftBodyPnts.concat(rightBodyPnts);
    },
    // * 获取箭头点
    getArrowPoints: (
      pnt1: PointArr,
      pnt2: PointArr,
      pnt3: PointArr,
      clockWise: number
    ): PointArr => {
      const midPnt = P.PlotUtils.mid(pnt1, pnt2);
      const len = P.PlotUtils.distance(midPnt, pnt3);
      let midPnt1 = P.PlotUtils.getThirdPoint(pnt3, midPnt, 0, len * 0.3, true);
      let midPnt2 = P.PlotUtils.getThirdPoint(pnt3, midPnt, 0, len * 0.5, true);
      midPnt1 = P.PlotUtils.getThirdPoint(
        midPnt,
        midPnt1,
        P.Constants.HALF_PI,
        len / 5,
        clockWise
      );
      midPnt2 = P.PlotUtils.getThirdPoint(
        midPnt,
        midPnt2,
        P.Constants.HALF_PI,
        len / 4,
        clockWise
      );

      const points = [midPnt, midPnt1, midPnt2, pnt3];
      // 计算箭头部分
      const arrowPnts = arrowPlot.algorithm.getArrowHeadPoints(
        points,
        doubleArrowParams.headHeightFactor,
        doubleArrowParams.headWidthFactor,
        doubleArrowParams.neckHeightFactor,
        doubleArrowParams.neckWidthFactor
      );
      const neckLeftPoint = arrowPnts[0];
      const neckRightPoint = arrowPnts[4];
      // 计算箭身部分
      const tailWidthFactor =
        P.PlotUtils.distance(pnt1, pnt2) /
        P.PlotUtils.getBaseLength(points) /
        2;
      const bodyPnts = arrowPlot.algorithm.getArrowBodyPoints(
        points,
        neckLeftPoint,
        neckRightPoint,
        tailWidthFactor
      );
      const n = bodyPnts.length;
      let lPoints = bodyPnts.slice(0, n / 2);
      let rPoints = bodyPnts.slice(n / 2, n);
      lPoints.push(neckLeftPoint);
      rPoints.push(neckRightPoint);
      lPoints = lPoints.reverse();
      lPoints.push(pnt2);
      rPoints = rPoints.reverse();
      rPoints.push(pnt1);
      return lPoints.reverse().concat(arrowPnts, rPoints);
    },
    // * 获取钳击箭头坐标
    getDoubleArrow: (pnts: PointArr[]): Cartesian3[] => {
      let pnt;
      if (pnts.length == 2 || pnts[1].toString() == pnts[2].toString()) {
        const mid = P.PlotUtils.mid(pnts[0], pnts[1]);
        const d = P.PlotUtils.distance(pnts[0], mid);
        pnt = P.PlotUtils.getThirdPoint(pnts[0], mid, P.Constants.HALF_PI, d);
      }
      const pnt1 = pnts[0];
      const pnt2 = pnts[1];
      const pnt3 = pnt ? pnt : pnts[2];
      let tempPoint4, connPoint;
      if (pnts.length == 3)
        tempPoint4 = arrowPlot.algorithm.getTempPoint4(pnt1, pnt2, pnt3);
      else tempPoint4 = pnts[3];
      if (pnts.length == 3 || pnts.length == 4)
        connPoint = P.PlotUtils.mid(pnt1, pnt2);
      else connPoint = pnts[4];
      let leftArrowPnts, rightArrowPnts;
      if (P.PlotUtils.isClockWise(pnt1, pnt2, pnt3)) {
        leftArrowPnts = arrowPlot.algorithm.getArrowPoints(
          pnt1,
          connPoint,
          tempPoint4,
          false
        );
        rightArrowPnts = arrowPlot.algorithm.getArrowPoints(
          connPoint,
          pnt2,
          pnt3,
          true
        );
      } else {
        leftArrowPnts = arrowPlot.algorithm.getArrowPoints(
          pnt2,
          connPoint,
          pnt3,
          false
        );
        rightArrowPnts = arrowPlot.algorithm.getArrowPoints(
          connPoint,
          pnt1,
          tempPoint4,
          true
        );
      }
      const m = leftArrowPnts.length;
      const t = (m - 5) / 2;

      const llBodyPnts = leftArrowPnts.slice(0, t);
      const lArrowPnts = leftArrowPnts.slice(t, t + 5);
      let lrBodyPnts = leftArrowPnts.slice(t + 5, m);

      let rlBodyPnts = rightArrowPnts.slice(0, t);
      const rArrowPnts = rightArrowPnts.slice(t, t + 5);
      const rrBodyPnts = rightArrowPnts.slice(t + 5, m);

      rlBodyPnts = P.PlotUtils.getBezierPoints(rlBodyPnts);
      const bodyPnts = P.PlotUtils.getBezierPoints(
        rrBodyPnts.concat(llBodyPnts.slice(1))
      );
      lrBodyPnts = P.PlotUtils.getBezierPoints(lrBodyPnts);

      const positions = rlBodyPnts.concat(
        rArrowPnts,
        bodyPnts,
        lArrowPnts,
        lrBodyPnts
      );
      return positions;
    },
    // * 获取细直箭头或者突击方向箭头坐标
    getFineOrAssault: (pnts: PointArr, param: FineOrAssault): Cartesian3[] => {
      const pnt1 = pnts[0];
      const pnt2 = pnts[1];
      const len = P.PlotUtils.getBaseLength(pnts);
      const tailWidth = len * param.tailWidthFactor;
      const neckWidth = len * param.neckWidthFactor;
      const headWidth = len * param.headWidthFactor;
      const tailLeft = P.PlotUtils.getThirdPoint(
        pnt2,
        pnt1,
        P.Constants.HALF_PI,
        tailWidth,
        true
      );
      const tailRight = P.PlotUtils.getThirdPoint(
        pnt2,
        pnt1,
        P.Constants.HALF_PI,
        tailWidth,
        false
      );
      const headLeft = P.PlotUtils.getThirdPoint(
        pnt1,
        pnt2,
        param.headAngle,
        headWidth,
        false
      );
      const headRight = P.PlotUtils.getThirdPoint(
        pnt1,
        pnt2,
        param.headAngle,
        headWidth,
        true
      );
      const neckLeft = P.PlotUtils.getThirdPoint(
        pnt1,
        pnt2,
        param.neckAngle,
        neckWidth,
        false
      );
      const neckRight = P.PlotUtils.getThirdPoint(
        pnt1,
        pnt2,
        param.neckAngle,
        neckWidth,
        true
      );
      return [
        lonLatToCartesian(tailLeft),
        lonLatToCartesian(neckLeft),
        lonLatToCartesian(headLeft),
        lonLatToCartesian(pnt2),
        lonLatToCartesian(headRight),
        lonLatToCartesian(neckRight),
        lonLatToCartesian(tailRight),
      ];
    },
    // * 获取细直箭头坐标
    getFineArrow: (pnts: PointArr): Cartesian3[] => {
      return arrowPlot.algorithm.getFineOrAssault(pnts, fineArrowParams);
    },
    // * 获取突击方向坐标
    getAssaultDirection: (pnts: PointArr): Cartesian3[] => {
      return arrowPlot.algorithm.getFineOrAssault(pnts, assaultDirectionParams);
    },
    // * 获取进攻方向箭头坐标
    getAttackArrowHeadPoints: (
      points: PointArr,
      tailLeft: PointArr,
      tailRight: PointArr
    ): PointArr => {
      let len = P.PlotUtils.getBaseLength(points);
      let headHeight = len * attackArrowParams.headHeightFactor;
      const headPnt = points[points.length - 1];
      len = P.PlotUtils.distance(headPnt, points[points.length - 2]);
      const tailWidth = P.PlotUtils.distance(tailLeft, tailRight);
      if (headHeight > tailWidth * attackArrowParams.headTailFactor) {
        headHeight = tailWidth * attackArrowParams.headTailFactor;
      }
      const headWidth = headHeight * attackArrowParams.headWidthFactor;
      const neckWidth = headHeight * attackArrowParams.neckWidthFactor;
      headHeight = headHeight > len ? len : headHeight;
      const neckHeight = headHeight * attackArrowParams.neckHeightFactor;
      const headEndPnt = P.PlotUtils.getThirdPoint(
        points[points.length - 2],
        headPnt,
        0,
        headHeight,
        true
      );
      const neckEndPnt = P.PlotUtils.getThirdPoint(
        points[points.length - 2],
        headPnt,
        0,
        neckHeight,
        true
      );
      const headLeft = P.PlotUtils.getThirdPoint(
        headPnt,
        headEndPnt,
        P.Constants.HALF_PI,
        headWidth,
        false
      );
      const headRight = P.PlotUtils.getThirdPoint(
        headPnt,
        headEndPnt,
        P.Constants.HALF_PI,
        headWidth,
        true
      );
      const neckLeft = P.PlotUtils.getThirdPoint(
        headPnt,
        neckEndPnt,
        P.Constants.HALF_PI,
        neckWidth,
        false
      );
      const neckRight = P.PlotUtils.getThirdPoint(
        headPnt,
        neckEndPnt,
        P.Constants.HALF_PI,
        neckWidth,
        true
      );
      return [neckLeft, headLeft, headPnt, headRight, neckRight];
    },
    // * 获取进攻方向箭身坐标
    getAttackArrowBodyPoints: (
      points: PointArr,
      neckLeft: PointArr,
      neckRight: PointArr,
      tailWidthFactor: number
    ): PointArr => {
      const allLen = P.PlotUtils.wholeDistance(points);
      const len = P.PlotUtils.getBaseLength(points);
      const tailWidth = len * tailWidthFactor;
      const neckWidth = P.PlotUtils.distance(neckLeft, neckRight);
      const widthDif = (tailWidth - neckWidth) / 2;
      let tempLen = 0;
      const leftBodyPnts = [],
        rightBodyPnts = [];
      for (let i = 1; i < points.length - 1; i++) {
        const angle =
          P.PlotUtils.getAngleOfThreePoints(
            points[i - 1],
            points[i],
            points[i + 1]
          ) / 2;
        tempLen += P.PlotUtils.distance(points[i - 1], points[i]);
        const w =
          (tailWidth / 2 - (tempLen / allLen) * widthDif) / Math.sin(angle);
        const left = P.PlotUtils.getThirdPoint(
          points[i - 1],
          points[i],
          Math.PI - angle,
          w,
          true
        );
        const right = P.PlotUtils.getThirdPoint(
          points[i - 1],
          points[i],
          angle,
          w,
          false
        );
        leftBodyPnts.push(left);
        rightBodyPnts.push(right);
      }
      return leftBodyPnts.concat(rightBodyPnts);
    },
    // * 获取进攻方向坐标
    getAttackArrow: (pnts: PointArr[]): PointArr[] => {
      // 计算箭尾
      let tailLeft = pnts[0];
      let tailRight = pnts[1];
      if (P.PlotUtils.isClockWise(pnts[0], pnts[1], pnts[2])) {
        tailLeft = pnts[1];
        tailRight = pnts[0];
      }
      const midTail = P.PlotUtils.mid(tailLeft, tailRight);
      const bonePnts = [midTail].concat(pnts.slice(2));
      // 计算箭头
      const headPnts = arrowPlot.algorithm.getAttackArrowHeadPoints(
        bonePnts,
        tailLeft,
        tailRight
      );
      const neckLeft = headPnts[0];
      const neckRight = headPnts[4];
      const tailWidthFactor =
        P.PlotUtils.distance(tailLeft, tailRight) /
        P.PlotUtils.getBaseLength(bonePnts);
      // 计算箭身
      const bodyPnts = arrowPlot.algorithm.getAttackArrowBodyPoints(
        bonePnts,
        neckLeft,
        neckRight,
        tailWidthFactor
      );
      // 整合
      const count = bodyPnts.length;
      let leftPnts = [tailLeft].concat(bodyPnts.slice(0, count / 2));
      leftPnts.push(neckLeft);
      let rightPnts = [tailRight].concat(bodyPnts.slice(count / 2, count));
      rightPnts.push(neckRight);

      leftPnts = P.PlotUtils.getQBSplinePoints(leftPnts);
      rightPnts = P.PlotUtils.getQBSplinePoints(rightPnts);
      return leftPnts.concat(headPnts, rightPnts.reverse());
    },
    // * 获取进攻方向尾坐标
    getTailedAttackArrow: (pnts: PointArr[]): PointArr[] => {
      let tailLeft = pnts[0];
      let tailRight = pnts[1];
      if (P.PlotUtils.isClockWise(pnts[0], pnts[1], pnts[2])) {
        tailLeft = pnts[1];
        tailRight = pnts[0];
      }
      const midTail = P.PlotUtils.mid(tailLeft, tailRight);
      const bonePnts = [midTail].concat(pnts.slice(2));
      const headPnts = arrowPlot.algorithm.getAttackArrowHeadPoints(
        bonePnts,
        tailLeft,
        tailRight
      );
      const neckLeft = headPnts[0];
      const neckRight = headPnts[4];
      const tailWidth = P.PlotUtils.distance(tailLeft, tailRight);
      const allLen = P.PlotUtils.getBaseLength(bonePnts);
      const len =
        allLen *
        attackArrowParams.tailWidthFactor *
        attackArrowParams.swallowTailFactor;
      const swallowTailPnt = P.PlotUtils.getThirdPoint(
        bonePnts[1],
        bonePnts[0],
        0,
        len,
        true
      );
      const factor = tailWidth / allLen;
      const bodyPnts = arrowPlot.algorithm.getAttackArrowBodyPoints(
        bonePnts,
        neckLeft,
        neckRight,
        factor
      );
      const count = bodyPnts.length;
      let leftPnts = [tailLeft].concat(bodyPnts.slice(0, count / 2));
      leftPnts.push(neckLeft);
      let rightPnts = [tailRight].concat(bodyPnts.slice(count / 2, count));
      rightPnts.push(neckRight);

      leftPnts = P.PlotUtils.getQBSplinePoints(leftPnts);
      rightPnts = P.PlotUtils.getQBSplinePoints(rightPnts);

      return leftPnts.concat(headPnts, rightPnts.reverse(), [
        swallowTailPnt,
        leftPnts[0],
      ]);
    },
    // * 获取尾点
    getTailPoints: (points: PointArr): PointArr[] => {
      const allLen = P.PlotUtils.getBaseLength(points);
      const tailWidth = allLen * squadCombatParams.tailWidthFactor;
      const tailLeft = P.PlotUtils.getThirdPoint(
        points[1],
        points[0],
        P.Constants.HALF_PI,
        tailWidth,
        false
      );
      const tailRight = P.PlotUtils.getThirdPoint(
        points[1],
        points[0],
        P.Constants.HALF_PI,
        tailWidth,
        true
      );
      return [tailLeft, tailRight];
    },
    // * 获取分队战斗行动坐标
    getSquadCombat: (pnts: PointArr[]): PointArr[] => {
      const tailPnts = arrowPlot.algorithm.getTailPoints(pnts);
      const headPnts = arrowPlot.algorithm.getAttackArrowHeadPoints(
        pnts,
        tailPnts[0],
        tailPnts[1]
      );
      const neckLeft = headPnts[0];
      const neckRight = headPnts[4];
      const bodyPnts = arrowPlot.algorithm.getAttackArrowBodyPoints(
        pnts,
        neckLeft,
        neckRight,
        squadCombatParams.tailWidthFactor
      );
      const count = bodyPnts.length;
      let leftPnts = [tailPnts[0]].concat(bodyPnts.slice(0, count / 2));
      leftPnts.push(neckLeft);
      let rightPnts = [tailPnts[1]].concat(bodyPnts.slice(count / 2, count));
      rightPnts.push(neckRight);

      leftPnts = P.PlotUtils.getQBSplinePoints(leftPnts);
      rightPnts = P.PlotUtils.getQBSplinePoints(rightPnts);

      return leftPnts.concat(headPnts, rightPnts.reverse());
    },
    // * 获取分队战斗行动尾尾点
    getTailedTailPoints: (points: PointArr): PointArr[] => {
      const allLen = P.PlotUtils.getBaseLength(points);
      const tailWidth = allLen * squadCombatParams.tailWidthFactor;
      const tailLeft = P.PlotUtils.getThirdPoint(
        points[1],
        points[0],
        P.Constants.HALF_PI,
        tailWidth,
        false
      );
      const tailRight = P.PlotUtils.getThirdPoint(
        points[1],
        points[0],
        P.Constants.HALF_PI,
        tailWidth,
        true
      );
      const len = tailWidth * squadCombatParams.swallowTailFactor;
      const swallowTailPnt = P.PlotUtils.getThirdPoint(
        points[1],
        points[0],
        0,
        len,
        true
      );
      return [tailLeft, swallowTailPnt, tailRight];
    },
    // * 获取分队战斗行动尾坐标
    getTailedSquadCombat: (pnts: PointArr[]): PointArr[] => {
      const tailPnts = arrowPlot.algorithm.getTailedTailPoints(pnts);
      const headPnts = arrowPlot.algorithm.getAttackArrowHeadPoints(
        pnts,
        tailPnts[0],
        tailPnts[2]
      );
      const neckLeft = headPnts[0];
      const neckRight = headPnts[4];
      const bodyPnts = arrowPlot.algorithm.getAttackArrowBodyPoints(
        pnts,
        neckLeft,
        neckRight,
        squadCombatParams.tailWidthFactor
      );
      const count = bodyPnts.length;
      let leftPnts = [tailPnts[0]].concat(bodyPnts.slice(0, count / 2));
      leftPnts.push(neckLeft);
      let rightPnts = [tailPnts[2]].concat(bodyPnts.slice(count / 2, count));
      rightPnts.push(neckRight);

      leftPnts = P.PlotUtils.getQBSplinePoints(leftPnts);
      rightPnts = P.PlotUtils.getQBSplinePoints(rightPnts);
      return leftPnts.concat(headPnts, rightPnts.reverse(), [
        tailPnts[1],
        leftPnts[0],
      ]);
    },
  },
};
