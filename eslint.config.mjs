import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "docs/**",
  ]),
  {
    files: ["src/lib/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "Buffer",
          message:
            "Buffer is a Node API — use Web APIs (btoa/atob, Uint8Array) in client-safe code.",
        },
        {
          name: "process",
          message:
            "process is a Node global — not available in the browser bundle.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "buffer",
              message: "Do not import the buffer polyfill in client code.",
            },
            {
              name: "node:crypto",
              message: "Use crypto.randomUUID() (Web Crypto) instead.",
            },
            {
              name: "node:fs",
              message: "Filesystem APIs are server-only.",
            },
            {
              name: "fs",
              message: "Filesystem APIs are server-only.",
            },
          ],
          patterns: ["node:*"],
        },
      ],
    },
  },
]);

export default eslintConfig;
