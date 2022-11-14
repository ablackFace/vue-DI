const { reactive, effect } = require("./reactive")

const arr = reactive([1])

effect( () => {
    arr.push( 1 )
} )

effect( () => {
    arr.push( 2 )
} )

console.log( arr )