/** 分支切换处理遗留的副作用函数
 *  - 什么是 "遗留的副作用函数" ???
 *      effect( function effectFn(){
 *          document.body.innerHTML = obj.ok ? obj.text : "not"
 *      } )
 *      - 当 obj.ok 的值修改为 false 的时候，不会读取 obj.text,只会触发字段 obj.ok 的读取操作
 *      - 所以在理想状态下 obj.text 所对应的依赖不应该被集合收集
 *  - 如何解决 ？？？
 *      - 每当副作用函数执行的时候，把之前关联的依赖从集合中删除
 *      - 当副作用执行完毕之后，在重新建立联系
 */


let activeEffect
function effect( fn ) {
    const effectFn = () => {
        cleanup( effectFn )
        activeEffect = effectFn
        fn()
    }

    effectFn.deps = []
    effectFn()
}


const bucket = new WeakMap()
const data = { ok:true,text:"Hello Vue3" }
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

    activeEffect.deps.push( deps )
}

// 在 set 拦截函数内调用 trigger 函数触发变化
function trigger( target,key ) {
    const depsMap = bucket.get( target )
    if( !depsMap ) return

    const effects = depsMap.get( key )
    effects && effects.forEach( fn => fn() )
}

function cleanup(){
    
}

effect( () => {
    console.log( "effect run" );
    document.body.innerHTML = obj.ok ? obj.text : "not"
} )

setTimeout( () => {
    obj.ok = false

    setTimeout( () => {
        obj.text = "触发副作用函数"
    },1000 )
},1000 )

