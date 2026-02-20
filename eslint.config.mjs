import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  // ignores first
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/generated/**",
      "prisma/**",
    ],
  },

  // Next recommended rules
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // ✅ OVERRIDES MUST BE AFTER extends (so they win)
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // stop build failing on any
      "@typescript-eslint/no-explicit-any": "off",

      // stop build failing on ts-ignore description requirement
      "@typescript-eslint/ban-ts-comment": "off",

      // keep unused vars as warnings only
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
];