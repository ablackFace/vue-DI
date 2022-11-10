const { readonly, effect } = require("./reactive")

const data = readonly( { foo:1 } )
effect( () => {
    console.log( "effect=>",data.foo )
} )
// 尝试修改数据，会得到警告
data.foo = 2