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
        // Two floors apply. :has(), which every stylesheet here depends on, needs 121 — below
        // that Sift installs happily and then filters nothing. data_collection_permissions,
        // which AMO requires of new submissions, needs 140 (142 on Android). The higher one
        // wins; 140 is over a year old and is the current ESR line.
        strict_min_version: "140.0",
        // Sift collects nothing: settings live in the browser's own storage and never leave
        // the device beyond Firefox Sync.
        data_collection_permissions: {
          required: ["none"],
        },
      },
      gecko_android: {
        strict_min_version: "142.0",
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
