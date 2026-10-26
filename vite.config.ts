import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

const LOCAL_D1_BINDING = "DB";
const LOCAL_D1_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: [
    {
      binding: LOCAL_D1_BINDING,
      database_name: "hanzi-os-local",
      database_id: LOCAL_D1_PLACEHOLDER_DATABASE_ID,
    },
  ],
  r2_buckets: [],
  images: { binding: 'IMAGES', remote: false },
};

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    define: {
      __HANZI_LOCAL_OFFLINE_PREVIEW__: JSON.stringify(process.env.HANZI_LOCAL_OFFLINE_PREVIEW === '1'),
      __HANZI_HOSTED_STUDY__: process.env.HANZI_HOSTED_STUDY_BUILD ?? 'null',
    },
    server: {
      hmr: { overlay: false },
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        ...(process.env.HANZI_CLOUDFLARE_CONFIG
          ? { configPath: process.env.HANZI_CLOUDFLARE_CONFIG }
          : { config: localBindingConfig }),
      }),
    ],
  };
});
