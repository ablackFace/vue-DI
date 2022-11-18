const { reactive, effect } = require("./reactive")

const key = { key:1 }
const value = new Set([1,2,3])
const p = reactive( new Map([
    [ key,value ]
]) )

effect( () => {
    p.forEach( function ( value,key ) {
        console.log( "value.size=>",value.size )
    } )
} )

p.get( key ).delete( 1 )