<template>
  <div id="cesiumContainer"></div>
</template>
<script setup lang="ts">
import { onMounted } from "vue";
import { Viewer, Rectangle, createWorldTerrain } from "cesium";
import CesiumNavigation from "cesium-navigation-es6";
onMounted(() => {
  window.Viewer = new Viewer("cesiumContainer", {
    animation: true, // * 左下角圆盘 速度控制器
    shouldAnimate: true, // * 当动画控件出现，用来控制是否通过旋转控件，旋转场景
    baseLayerPicker: false, // * 右上角图层选择器
    fullscreenButton: false, // * 右下角全屏按钮
    vrButton: false, // * 右下角vr按钮
    homeButton: false, // * 右上角地图恢复到初始页面按钮
    selectionIndicator: false, // * 点击后地图上显示的选择控件
    infoBox: false, // * 右上角鼠标点击后信息展示框
    sceneModePicker: false, // * 右上角2D和3D之间的切换
    timeline: true, // * 页面下方的时间条
    navigationHelpButton: false, // * 右上角帮助按钮
    navigationInstructionsInitiallyVisible: false, // * 是否展开帮助
    scene3DOnly: true, // * 如果设置为true，则所有几何图形以3D模式绘制以节约GPU资源
    useDefaultRenderLoop: true, // * 控制渲染循环
    showRenderLoopErrors: false, // * HTML面板中显示错误信息
    useBrowserRecommendedResolution: true, // * 如果为true，则以浏览器建议的分辨率渲染并忽略window.devicePixelRatio
    automaticallyTrackDataSourceClocks: true, // * 自动追踪最近添加的数据源的时钟设置
    orderIndependentTranslucency: true, // * 如果为true并且配置支持它，则使用顺序无关的半透明性
    shadows: false, // * 阴影效果
    projectionPicker: false, // * 透视投影和正投影之间切换
    requestRenderMode: true, // * 在指定情况下进行渲染,提高性能
    terrainProvider: createWorldTerrain(),
  });
  window.Viewer._cesiumWidget._creditContainer.style.display = "none"; // * 隐藏版权信息
  window.Viewer.scene.globe.depthTestAgainstTerrain = true; // * 开启深度测试

  interface CesiumNavigationOptions {
    defaultResetView: Rectangle; // * 用于在使用重置导航重置地图视图时设置默认视图控制。接受的值是Cesium.Cartographic 和 Cesium.Rectangle.
    enableCompass: boolean; // * 用于启用或禁用罗盘。true是启用罗盘，false是禁用罗盘。默认值为true。如果将选项设置为false，则罗盘将不会添加到地图中。
    enableZoomControls: boolean; // * 用于启用或禁用缩放控件。true是启用，false是禁用。默认值为true。如果将选项设置为false，则缩放控件将不会添加到地图中。
    enableDistanceLegend: boolean; // * 用于启用或禁用比例尺。true是启用，false是禁用。默认值为true。如果将选项设置为false，比例尺将不会添加到地图中。
    enableCompassOuterRing: boolean; // * 用于启用或禁用指南针外环。true是启用，false是禁用。默认值为true。如果将选项设置为false，则该环将可见但无效。
  }
  var options: CesiumNavigationOptions = {
    defaultResetView: Rectangle.fromDegrees(80, 22, 130, 50),
    enableCompass: true,
    enableZoomControls: false,
    enableDistanceLegend: false,
    enableCompassOuterRing: true,
  };

  new CesiumNavigation(window.Viewer, options);
});
</script>
<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100%;
}
</style>
