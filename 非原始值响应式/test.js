const { reactive, effect } = require("./reactive")

const date = reactive([1,2,3,4,5])

effect( () => {
    for( const val of date ) {
        console.log( "for...of=>",val )
    }
} )

date[1] = "bar"
date.length = 0