const { reactive, effect } = require("./reactive")

// 原始数据
const m = new Map()

// 响应式数据
const p1 = reactive( m )
const p2 = reactive( new Map() )

// 设置响应式数据
p1.set( "p2",p2 )
effect( () => {
    console.log( "effect=>",m.get( "p2" ).size )
} )
// 设置原始数据，可以触发响应式
m.get( "p2" ).set( "foo",1 )
