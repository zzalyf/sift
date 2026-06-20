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
        id: "{70c8d535-6562-4b28-9ec1-b2f71ad857a4}",
        strict_min_version: "109.0",
        data_collection_permissions: {
          required: ["none"],
        },
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
