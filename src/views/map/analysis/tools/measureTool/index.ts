export default class MeasurementCalc {
  floatPoint: any;
  primitiveList: any[];
  entityList: any[];
  pointList: any[];
  handler: any;
  constructor() {
    this.primitiveList = this.entityList = this.pointList = [];
  }

  //   * 获取平面长度
  getPlaneLength() {}

  //   * 获取平面面积
  getPlaneArea() {}

  //   * 获取贴地长度
  getGroundLength() {}

  //   * 获取贴地面积
  getGroundArea() {}

  //   * 清除销毁测量
  distoryMeasure() {}

  //   * 清除某一类测量
  clearOne() {}
}
