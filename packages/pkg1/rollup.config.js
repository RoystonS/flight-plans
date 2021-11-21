import dotenv from "dotenv";
import path from "path";

import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import external from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";
import copy from "rollup-plugin-copy";
import autoprefixer from "autoprefixer";

const packageJson = require("./package.json");

dotenv.config({
  path: path.resolve(__dirname, ".env." + process.env.NODE_ENV),
});

export default {
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
          src: "static/data/*.json",
          dest: "dist/data",
          transform: (contents) => JSON.stringify(JSON.parse(contents)), // Strips out whitespace
        },
      ],
    }),
    replace({
      preventAssignment: true,
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
      "process.env.MAPBOX_TOKEN": JSON.stringify(process.env.MAPBOX_TOKEN),
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
