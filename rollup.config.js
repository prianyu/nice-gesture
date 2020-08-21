import { uglify } from "rollup-plugin-uglify"
import babel from "rollup-plugin-babel"
import banner from 'rollup-plugin-banner'



export default [{
  input: "src/index.js",
  output: {
    file: "dist/gesture.min.js",
    format: "umd",
    name: "Gesture"
  },
  plugins: [
    babel({
      exclude: "node_modules/**"
    }),
    uglify(),
    banner('gesture v<%= pkg.version %> by <%= pkg.author %>\nhttps://github.com/prianyu/gesture')
  ]
},{
  input: "src/index.js",
  output: {
    file: "dist/gesture.js",
    format: "umd",
    name: "Gesture"
  },
  plugins: [
    banner('gesture v<%= pkg.version %> by <%= pkg.author %>\nhttps://github.com/prianyu/gesture'),
    babel({
      exclude: "node_modules/**"
    })
  ]
}]