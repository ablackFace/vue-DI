const { reactive, effect } = require("./reactive")

const obj = {}
const proto = { bar:1 }
const child = reactive( obj )
const parent = reactive( proto )
Object.setPrototypeOf( child,parent )

effect( () => {
    console.log( "effect=>",child.bar )
} )

child.bar = 2