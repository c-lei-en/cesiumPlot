import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";

import htmlConfig from "vite-plugin-html-config";
import { viteExternalsPlugin } from "vite-plugin-externals";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";

import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

// https://vitejs.dev/config/
export default ({ mode: VITE_MODE }: { mode: string }) => {
  const env = loadEnv(VITE_MODE, process.cwd());
  console.log("VITE_MODE: ", VITE_MODE);
  console.log("ENV: ", env);

  const plugins = [
    vue(),
    viteCommonjs(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ];
  const externalConfig = viteExternalsPlugin({
    cesium: "Cesium",
  });
  const htmlConfigs = htmlConfig({
    headScripts: [
      {
        src: "./lib/cesium/Cesium.js",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "./lib/cesium/Widgets/widgets.css",
      },
    ],
  });
  plugins.push(externalConfig, htmlConfigs);

  return defineConfig({
    root: "./",
    build: {
      assetsDir: "./",
      minify: ["false"].includes(env.VITE_IS_MINIFY) ? false : true,
    },
    plugins: plugins,
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      https: false,
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `$injectedColor: orange;`,
        },
      },
    },
  });
};
