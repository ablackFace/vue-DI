const { reactive, effect } = require("./reactive")

const s = new Set( [1,2,3] )
const p = reactive(s)

console.log(p.size)