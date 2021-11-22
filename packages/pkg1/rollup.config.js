import dotenv from "dotenv";
import path from "path";

import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import external from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";
import copy from "rollup-plugin-copy";
import { terser } from "rollup-plugin-terser";
import autoprefixer from "autoprefixer";

const packageJson = require("./package.json");

dotenv.config({
  path: path.resolve(__dirname, ".env." + process.env.NODE_ENV),
});

const config = {
  input: "src/index.tsx",
  output: {
    file: packageJson.main,
    format: "es",
  },
  plugins: [
    copy({
      targets: [
        { src: "static/*", dest: "dist/" },
        {
          src: "static/plans/*.pln",
          dest: "dist/plans/",
        },
        {
          src: "static/data/*.json",
          dest: "dist/data",
          transform: (contents) => JSON.stringify(JSON.parse(contents)), // Strips out whitespace
        },
      ],
    }),
    replace({
      preventAssignment: true,
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    }),
    external(),
    resolve(),
    commonjs(),
    typescript(), // { tsconfig: "./tsconfig.json" }),
    postcss({
      autoModules: true,
      plugins: [autoprefixer()],
      minimize: process.env.NODE_ENV !== "development",
    }),
  ],
};

if (process.env.NODE_ENV === "production") {
  config.plugins.push(terser());
}

export default config;
