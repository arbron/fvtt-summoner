import fs from "fs";
import gulp from "gulp";
import nodeResolve from "@rollup/plugin-node-resolve";
import path from "path";
import { rollup } from "rollup";


/**
 * Cache of the manifest file in case it needs to be accessed more than once.
 * @type {object}
 */
let cached_manifest;


async function fetchManifest() {
  if ( !cached_manifest ) cached_manifest = JSON.parse(await fs.promises.readFile("./module.json"));
  return cached_manifest;
}


async function compileJavascript() {
  const manifest = await fetchManifest();
  for ( const esmodulePath of manifest.esmodules ) {
    const parsedPath = path.parse(esmodulePath);
    delete parsedPath.base;
    const compiledPath = path.format({ ...parsedPath, name: `${parsedPath.name}-compiled` });
    const sourcemapFile = path.format({ name: parsedPath.name, ext: parsedPath.ext });

    const bundle = await rollup({
      input: esmodulePath,
      plugins: [nodeResolve()]
    });
    await bundle.write({
      file: compiledPath,
      format: "es",
      sourcemap: true,
      sourcemapFile: sourcemapFile
    });
  }
}
export const compile = compileJavascript;
