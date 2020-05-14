// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';//Convert CommonJS modules to ES6
import { terser } from "rollup-plugin-terser";
import pkg from './package.json';


//FIXME(CC): remove alpha after sdk becomes stable
const banner = `/**
 * ${pkg.description} v${pkg.version}-alpha
 * @author: ${pkg.author}
 * @license: ${pkg.license}
 * @repository: ${pkg.repository.url}
 * @date: ${new Date().toString()}
 **/
`;


let output;

if (process.env.NODE_ENV === 'production') {
  //TODO(CC): add map for debug
  output = {
    file: 'dst/dugon.min.js',
    format: 'umd',
    name: 'Dugon',
    plugins: [terser()],
    banner
  };
} else {
  output = {
    file: 'dst/dugon.js',
    format: 'umd',
    name: 'Dugon',
  };
}


export default {
  input: 'src/dugon.ts',
  output,
  plugins: [typescript({ tsconfig: './tsconfig.json' }), resolve(), commonjs()]
};