const { reactive, effect } = require("./reactive")

const obj = {foo:1}
const date = reactive([obj])

effect( () => {
    console.log( "arr.includes=>",date.includes( obj ) )
} )