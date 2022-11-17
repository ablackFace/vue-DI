const { reactive, effect } = require("./reactive")

const m = new Map([
    [ "key",1 ]
])
const p = reactive(m)

effect( () => {
    console.log("建立响应式链接=>",p)
} )
p.set( "key",2 )