import {
  CallbackProperty,
  Cartesian3,
  Color,
  PolygonHierarchy,
  type Entity,
  HeightReference,
} from "cesium";

export class FloodAnalysis {
  polygonEntities: null | Entity;
  extrudedHeight: number;
  height_max: number;
  height_min: number;
  step: number;
  polygon_degrees: Cartesian3[];
  speed: number;
  timer: number | null;
  constructor(
    height_max: number,
    height_min: number,
    step: number,
    positionsArr: Cartesian3[],
    speed: number
  ) {
    this.polygonEntities = null;
    this.extrudedHeight = height_min;
    this.height_max = height_max;
    this.height_min = height_min;
    this.step = step;
    this.polygon_degrees = positionsArr;
    this.speed = speed;
    this.timer = 0;
  }
  _drawPoly() {
    this.polygonEntities = window.Viewer.entities.add({
      polygon: {
        hierarchy: new PolygonHierarchy(this.polygon_degrees),
        material: Color.fromBytes(64, 157, 253, 100),
        heightReference: HeightReference.CLAMP_TO_GROUND,
        extrudedHeight: new CallbackProperty(() => this.extrudedHeight, false),
      },
    });
  }
  start() {
    const that = this;
    this.timer = window.setInterval(() => {
      if (
        that.height_max > that.extrudedHeight &&
        that.extrudedHeight >= that.height_min
      ) {
        that.extrudedHeight = that.extrudedHeight + that.step;
      } else {
        that.extrudedHeight = that.height_min;
      }
    }, that.speed * 1000);
    that._drawPoly();
  }
  clear() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.extrudedHeight = this.height_min;
    window.Viewer.entities.remove(this.polygonEntities);
    this.polygonEntities = null;
  }
  changeMapType(type: boolean) {
    if (!type) {
      this.polygonEntities && (this.polygonEntities.show = false);
    } else {
      this.polygonEntities && (this.polygonEntities.show = true);
    }
  }
}
