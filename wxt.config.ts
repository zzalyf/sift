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
        // 121 is where :has() shipped, which every stylesheet here depends on. Anything older
        // installs happily and then filters nothing.
        strict_min_version: "121.0",
        // Required for new AMO submissions. Sift collects nothing: settings live in the
        // browser's own storage and never leave the device beyond Firefox Sync.
        data_collection_permissions: {
          required: ["none"],
        },
      },
      gecko_android: {
        strict_min_version: "121.0",
      },
    },
    permissions: ["storage", "tabs"],
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
