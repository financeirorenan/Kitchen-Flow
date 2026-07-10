import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "server.js", "server.js.map", "tmp/**/*", "app/applet/tmp/**/*", "public/sw.js", "**/sw.js"]
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "prefer-const": "off",
      "no-useless-assignment": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "no-case-declarations": "off",
      "no-useless-escape": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "preserve-caught-error": "off"
    }
  }
);
