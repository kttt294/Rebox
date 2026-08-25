import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.next/**", "**/coverage/**", "**/src/generated.ts", "supabase/.temp/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["apps/*", "*/apps/*", "**/apps/**"],
              message: "Packages must not import from apps."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["apps/web/src/**/*.tsx"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Web components must call @rebox/api-client instead of fetch directly." }
      ],
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "@rebox/backend", message: "The web runtime must not import server-only implementation." }] }
      ]
    }
  }
);
