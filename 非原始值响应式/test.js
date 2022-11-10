const { readonly, effect } = require("./reactive")

const data = readonly( { foo:{ bar:1 } } )
effect( () => {
    console.log( "effect=>",data.foo.bar )
} )
data.foo.bar = 2