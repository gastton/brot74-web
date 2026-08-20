import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  security.configs.recommended,
  {
    rules: {
      // Flags any setState call reachable in an effect body, including the
      // standard "fetch on mount/dep change" and "restore from localStorage"
      // patterns used across the admin panels and the storefront cart. Kept
      // as a warning instead of an error to avoid forcing a risky rewrite of
      // that state logic just to satisfy the linter.
      "react-hooks/set-state-in-effect": "warn",

      // Notoriamente ruidosa: marca cualquier acceso a objeto/array con una
      // key no literal, aunque venga tipada y no de input de usuario (ej.
      // process.env[name] con `name` como union type). Se deja como warning
      // para tener la señal disponible sin bloquear el lint por falsos
      // positivos.
      "security/detect-object-injection": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
