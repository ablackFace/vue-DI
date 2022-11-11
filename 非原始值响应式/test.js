const { reactive, effect } = require("./reactive")

const date = reactive(["foo"])

effect( () => {
    console.log( "effect=>",date[0] )
} )

date.length = 0