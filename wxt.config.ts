import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig, WxtViteConfig, UserConfig } from "wxt";
import pkg from "./package.json";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/auto-icons", "@wxt-dev/module-solid"],
  autoIcons: {
    baseIconPath: "./public/icon.svg",
    developmentIndicator: "overlay",
  },
  manifest: {
    name: "Sift",
    browser_specific_settings: {
      gecko: {
        id: "{08db9950-75b9-4264-a900-8ce20131614f}",
        strict_min_version: "109.0",
      },
      gecko_android: {
        strict_min_version: "113.0",
      },
    },
    permissions: ["storage", "activeTab", "tabs"],
  },
  vite: () => {
    return {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./"),
        },
      },
      define: {
        "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
      },
    } as WxtViteConfig;
  },
} as UserConfig);
