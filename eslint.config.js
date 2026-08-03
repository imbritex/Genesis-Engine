// https://docs.expo.dev/guides/using-eslint/
import globals from "globals";
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    languageOptions: {
      globals: globals.browser,
    },
  },
]);
