const { reactive, effect } = require("./reactive")

const m = new Map([
    [ { key:1 },{value:1} ]
])

const p = reactive( m )

effect( () => {
    p.forEach( function ( value,key,m ) {
        console.log( "value=>",value )
        console.log( "key=>",key )
    } )
    console.log( "effect=>",p )
} )

p.set( {key:2},{ value:2 } )
