const { shallowReactive, effect } = require("./reactive")

const data = {
    foo:{
        bar:1
    }
}

const obj = shallowReactive( data )

effect( () => {
    console.log( "effect=>",obj.foo.bar )
} )

obj.foo.bar = 2