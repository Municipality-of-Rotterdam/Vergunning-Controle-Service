const errLevel = process.env["ESLINT_STRICT"] ? "error" : "warn";

module.exports = {
  parser: "@typescript-eslint/parser", // Specifies the ESLint parser
  ignorePatterns: [".eslintrc.cjs", "lib"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json"
  },
  plugins: ["@typescript-eslint", "lodash"],
  rules: {
    "no-return-await": "off", // Disable this rule so that "@typescript-eslint/return-await" works correctly.
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/return-await": ["error", "in-try-catch"],
    "no-console": [
      errLevel,
      { allow: ["time", "timeEnd", "trace", "warn", "error", "info", "groupEnd", "group", "groupCollapsed"] },
    ],
    "lodash/import-scope": [errLevel, "member"],
  },
};
