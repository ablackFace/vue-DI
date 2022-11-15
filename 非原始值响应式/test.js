const { reactive, effect } = require("./reactive")

const s = new Set( [1,2,3] )
const p = reactive(s)

console.log(p.size)
p.delete(1)     // TypeError: Method Set.prototype.delete called on incompatible receiver
console.log( p );