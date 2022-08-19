import gulp from "gulp";
import nodeResolve from "@rollup/plugin-node-resolve";
import { rollup } from "rollup";


async function compileJavascript() {
  const bundle = await rollup({
    input: "./summoner.mjs",
    plugins: [nodeResolve()]
  });
  await bundle.write({
    file: "./summoner-compiled.mjs",
    format: "es",
    sourcemap: true,
    sourcemapFile: "summoner.mjs"
  });
}
export const buildJS = gulp.series(compileJavascript);
