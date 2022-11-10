const { effect, shallowReadonly } = require("./reactive")

const data = shallowReadonly( { foo:{ bar:1 } } )
effect( () => {
    console.log( "effect=>",data.foo.bar )
} )
data.foo.bar = 2