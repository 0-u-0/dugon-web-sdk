// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';//Convert CommonJS modules to ES6
import terser from '@rollup/plugin-terser';
import del from 'rollup-plugin-delete';

import { createRequire } from "module";
const pkg = createRequire(import.meta.url)("./package.json");

//FIXME(CC): remove alpha after sdk becomes stable
const banner = `/**
 * ${pkg.description} v${pkg.version}-alpha
 * @author: ${pkg.author}
 * @license: ${pkg.license}
 * @repository: ${pkg.repository.url}
 * @date: ${new Date().toString()}
 **/
`;


let output = [];

if (process.env.NODE_ENV === 'production') {
  //TODO(CC): add map for debug
  if (process.env.BROWSER === 'true') {
    output.push({
      file: 'dist/dugon.min.js',
      format: 'umd',
      name: 'Dugon',
      sourcemap: true,
      plugins: [terser()],
      banner
    });
  } else {
    output.push({
      file: 'dist/dugon.js',
      format: 'cjs',
    });

    output.push({
      file: 'dist/dugon.mjs',
      format: 'esm',
    });
  }
} else {
  output.push({
    file: 'dist/dugon.dev.js',
    format: 'umd',
    name: 'Dugon',
  });
}


export default {
  input: 'src/dugon.ts',
  output,
  plugins: [
    del({ targets: 'dist/*' }), // This will delete all files in the dist directory
    typescript({ tsconfig: './tsconfig.json' }),
    resolve(),
    commonjs()]
};