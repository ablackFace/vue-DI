const { reactive, effect } = require("./reactive")

const s = new Set( [1,2,3] )
const p = reactive(s)

effect( () => {
    console.log("建立响应式链接=>",p.size)
} )
p.delete( 1 )