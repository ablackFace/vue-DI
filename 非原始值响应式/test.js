const { reactive, effect } = require("./reactive")

const data = {
    foo:{
        bar:1
    }
}

const obj = reactive( data )

effect( () => {
    console.log( "effect=>",obj.foo.bar )
} )

obj.foo.bar = 2