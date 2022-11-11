const { reactive, effect } = require("./reactive")

const date = reactive(["foo"])

effect( () => {
    for( const key in date ) {
        console.log( "for...in=>",key )
    }
} )

date[1] = "bar"
date.length = 0