
// 创建一个全局变量用来储存被注册的副作用函数
let activeEffect
// effect 函数用于注册副作用函数
function effect( fn ) {
    // 当调用 effect 注册副作用函数的时候,将副作用函数 fn 赋值给 activeEffect
    activeEffect = fn
    // 执行 副作用函数
    fn()
}


const bucket = new WeakMap()
const data = {  text:"hello Vue3" }
const obj = new Proxy( data,{
    get:function( target,key ){
        tarck( target,key )
        return target[key]
    },
    set:function( target,key,newVal ){
        target[key] = newVal
        trigger( target,key )
    }
} )

// 在 get 拦截函数内调用 track 函数追踪变化
function tarck( target,key ) {
    if( !activeEffect ) return

    let depsMap = bucket.get( target )
    if( !depsMap ) {
        bucket.set( target,( depsMap = new Map() ) )
    }

    let deps = depsMap.get( key )
    if( !deps ) {
        depsMap.set( key,( deps = new Set() ) )
    }

    deps.add( activeEffect )
}

// 在 set 拦截函数内调用 trigger 函数触发变化
function trigger( target,key ) {
    const depsMap = bucket.get( target )
    if( !depsMap ) return

    const effects = depsMap.get( key )
    effects && effects.forEach( fn => fn() )
}

effect( () => {
    console.log("effect run");
    document.body.innerHTML = obj.text
} )

setTimeout( () => {
    obj.notExist = "Hello Vue3"
},1000 )