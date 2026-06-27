import { defineConfig } from "vite-plus";

export default defineConfig({
  // dev サーバーのポートを固定（他ポートへ自動的にずれないよう strictPort）。
  server: { port: 5173, strictPort: true },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
});
