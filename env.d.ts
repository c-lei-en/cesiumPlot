/// <reference types="vite/client" />
declare interface Window {
  Viewer: any;
}
declare module "element-plus";

interface ImportMetaEnv {
  VITE_CESIUM_BASE_URL: string;
}
