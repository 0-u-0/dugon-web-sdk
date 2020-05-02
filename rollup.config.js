// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';//Convert CommonJS modules to ES6

export default {
  input: 'src/index.ts',
  output: {
    file: 'dst/dugon.js',
    format: 'umd',
    name: 'Dugon',
  },
  plugins: [typescript({ tsconfig: './tsconfig.json' }),resolve(),commonjs()]
};