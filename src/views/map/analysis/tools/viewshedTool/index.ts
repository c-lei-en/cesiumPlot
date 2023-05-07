import {
  Camera,
  Cartesian2,
  Cartesian3,
  Cartesian4,
  Color,
  ColorGeometryInstanceAttribute,
  Entity,
  FrustumOutlineGeometry,
  GeometryInstance,
  HeadingPitchRoll,
  Matrix3,
  Matrix4,
  PerInstanceColorAppearance,
  PerspectiveFrustum,
  PostProcessStage,
  Primitive,
  Quaternion,
  ShadowMap,
  ShowGeometryInstanceAttribute,
  Transforms,
  Math as cesiumMath,
  ShadowMode,
} from "cesium";
import glsl from "./glsl.ts";

export class ViewshedAnalysis {
  private viewPosition: Cartesian3;
  private viewPositionEnd: Cartesian3;
  private viewDistance: number;
  private viewHeading: number;
  private viewPitch: number;
  private horizontalViewAngle: number;
  private verticalViewAngle: number;
  private visibleAreaColor: any;
  private invisibleAreaColor: any;
  private sketch: null | Entity;
  private postStage: null | PostProcessStage;
  private frustumOutline: null | Primitive;
  private lightCamera: Camera | undefined;
  private shadowMap: any;
  constructor(option: {
    viewPosition: Cartesian3;
    viewPositionEnd: Cartesian3;
    viewDistance: number;
    viewHeading: number;
    viewPitch: number;
    horizontalViewAngle: number;
    verticalViewAngle: number;
    visibleAreaColor: any;
    invisibleAreaColor: any;
  }) {
    this.viewPosition = option.viewPosition;
    this.viewPositionEnd = option.viewPositionEnd;
    this.viewDistance = option.viewDistance;
    this.viewHeading = option.viewHeading;
    this.viewPitch = option.viewPitch;
    this.horizontalViewAngle = option.horizontalViewAngle;
    this.verticalViewAngle = option.verticalViewAngle;
    this.visibleAreaColor = option.visibleAreaColor;
    this.invisibleAreaColor = option.invisibleAreaColor;
    this.sketch = null;
    this.postStage = null;
    this.frustumOutline = null;
    this.update();
  }
  private add() {
    this.createLightCamera();
    this.createShadowMap();
    this.createPostStage();
    this.drawFrustumOutline();
    this.drawSketch();
  }

  private update() {
    this.clear();
    this.add();
  }
  clear() {
    if (this.sketch) {
      window.Viewer.entities.removeById(this.sketch.id);
      this.sketch = null;
    }
    if (this.frustumOutline) {
      this.frustumOutline.destroy();
      this.frustumOutline = null;
    }
    if (this.postStage) {
      window.Viewer.scene.postProcessStages.remove(this.postStage);
      this.postStage = null;
    }
  }

  private createLightCamera() {
    this.lightCamera = new Camera(window.Viewer.scene);
    this.lightCamera.position = this.viewPosition;
    this.lightCamera.frustum.near = this.viewDistance * 0.001;
    this.lightCamera.frustum.far = this.viewDistance;
    const hr = cesiumMath.toRadians(this.horizontalViewAngle);
    const vr = cesiumMath.toRadians(this.verticalViewAngle);
    const aspectRatio =
      (this.viewDistance * Math.tan(hr / 2) * 2) /
      (this.viewDistance * Math.tan(vr / 2) * 2);
    (this.lightCamera.frustum as PerspectiveFrustum).aspectRatio = aspectRatio;
    (this.lightCamera.frustum as PerspectiveFrustum).fov = hr > vr ? hr : vr;
    this.lightCamera.setView({
      destination: this.viewPosition,
      orientation: {
        heading: cesiumMath.toRadians(this.viewHeading),
        pitch: cesiumMath.toRadians(this.viewPitch),
        roll: 0,
      },
    });
  }
  private createShadowMap() {
    this.shadowMap = new ShadowMap({
      context: window.Viewer.scene.context,
      lightCamera: this.lightCamera,
      enabled: true,
      isPointLight: true,
      pointLightRadius: this.viewDistance,
      cascadesEnabled: false,
      size: 256,
      softShadows: true,
      normalOffset: true,
      fromLightSource: false,
    });
    window.Viewer.scene.shadowMap = this.shadowMap;
    window.Viewer.scene.globe.shadows = ShadowMode.ENABLED;
    window.Viewer.scene.globe.depthTestAgainstTerrain = true;
  }
  private createPostStage() {
    const fs = glsl;
    const postStage = new PostProcessStage({
      fragmentShader: fs,
      uniforms: {
        shadowMap_textureCube: () => {
          this.shadowMap.update(
            Reflect.get(window.Viewer.scene, "_frameState")
          );
          return Reflect.get(this.shadowMap, "_shadowMapTexture");
        },
        shadowMap_matrix: () => {
          this.shadowMap.update(
            Reflect.get(window.Viewer.scene, "_frameState")
          );
          return Reflect.get(this.shadowMap, "_shadowMapMatrix");
        },
        shadowMap_lightPositionEC: () => {
          this.shadowMap.update(
            Reflect.get(window.Viewer.scene, "_frameState")
          );
          return Reflect.get(this.shadowMap, "_lightPositionEC");
        },
        shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness: () => {
          this.shadowMap.update(
            Reflect.get(window.Viewer.scene, "_frameState")
          );
          const bias = this.shadowMap._pointBias;
          return Cartesian4.fromElements(
            bias.normalOffsetScale,
            this.shadowMap._distance,
            this.shadowMap.maximumDistance,
            0.0,
            new Cartesian4()
          );
        },
        shadowMap_texelSizeDepthBiasAndNormalShadingSmooth: () => {
          this.shadowMap.update(
            Reflect.get(window.Viewer.scene, "_frameState")
          );
          const bias = this.shadowMap._pointBias;
          const scratchTexelStepSize = new Cartesian2();
          const texelStepSize = scratchTexelStepSize;
          texelStepSize.x = 1.0 / this.shadowMap._textureSize.x;
          texelStepSize.y = 1.0 / this.shadowMap._textureSize.y;

          return Cartesian4.fromElements(
            texelStepSize.x,
            texelStepSize.y,
            bias.depthBias,
            bias.normalShadingSmooth,
            new Cartesian4()
          );
        },
        camera_projection_matrix: this.lightCamera!.frustum.projectionMatrix,
        camera_view_matrix: this.lightCamera!.viewMatrix,
        helsing_viewDistance: () => {
          return this.viewDistance;
        },
        helsing_visibleAreaColor: this.visibleAreaColor,
        helsing_invisibleAreaColor: this.invisibleAreaColor,
      },
    });
    this.postStage = window.Viewer.scene.postProcessStages.add(postStage);
  }
  private drawFrustumOutline() {
    const scratchRight = new Cartesian3();
    const scratchRotation = new Matrix3();
    const scratchOrientation = new Quaternion();
    const direction = this.lightCamera!.directionWC;
    const up = this.lightCamera!.upWC;
    let right = this.lightCamera!.rightWC;
    right = Cartesian3.negate(right, scratchRight);
    const rotation = scratchRotation;
    Matrix3.setColumn(rotation, 0, right, rotation);
    Matrix3.setColumn(rotation, 1, up, rotation);
    Matrix3.setColumn(rotation, 2, direction, rotation);
    const orientation = Quaternion.fromRotationMatrix(
      rotation,
      scratchOrientation
    );

    const instance = new GeometryInstance({
      geometry: new FrustumOutlineGeometry({
        frustum: this.lightCamera!.frustum,
        origin: this.viewPosition,
        orientation: orientation,
      }),
      id: Math.random().toString(36).substr(2),
      attributes: {
        color: ColorGeometryInstanceAttribute.fromColor(Color.YELLOWGREEN),
        show: new ShowGeometryInstanceAttribute(true),
      },
    });

    this.frustumOutline = window.Viewer.scene.primitives.add(
      new Primitive({
        geometryInstances: [instance],
        appearance: new PerInstanceColorAppearance({
          flat: true,
          translucent: false,
        }),
      })
    );
  }
  private drawSketch() {
    this.sketch = window.Viewer.entities.add({
      name: "sketch",
      position: this.viewPosition,
      orientation: Transforms.headingPitchRollQuaternion(
        this.viewPosition,
        HeadingPitchRoll.fromDegrees(
          this.viewHeading - this.horizontalViewAngle,
          this.viewPitch,
          0.0
        )
      ),
      ellipsoid: {
        radii: new Cartesian3(
          this.viewDistance,
          this.viewDistance,
          this.viewDistance
        ),
        minimumClock: cesiumMath.toRadians(-this.horizontalViewAngle / 2),
        maximumClock: cesiumMath.toRadians(this.horizontalViewAngle / 2),
        minimumCone: cesiumMath.toRadians(this.verticalViewAngle + 7.75),
        maximumCone: cesiumMath.toRadians(180 - this.verticalViewAngle - 7.75),
        fill: false,
        outline: true,
        subdivisions: 256,
        stackPartitions: 64,
        slicePartitions: 64,
        outlineColor: Color.YELLOWGREEN,
      },
    });
  }
}

function getHeadingOrPitch(
  type: string,
  fromPosition: Cartesian3,
  toPosition: Cartesian3
): number {
  const finalPosition = new Cartesian3();
  const matrix4 = Transforms.eastNorthUpToFixedFrame(fromPosition);
  Matrix4.inverse(matrix4, matrix4);
  Matrix4.multiplyByPoint(matrix4, toPosition, finalPosition);
  Cartesian3.normalize(finalPosition, finalPosition);
  switch (type) {
    case "heading":
      return cesiumMath.toDegrees(Math.atan2(finalPosition.x, finalPosition.y));
      break;
    case "pitch":
      return cesiumMath.toDegrees(Math.asin(finalPosition.z));
      break;
    default:
      return cesiumMath.toDegrees(Math.atan2(finalPosition.x, finalPosition.y));
      break;
  }
}
