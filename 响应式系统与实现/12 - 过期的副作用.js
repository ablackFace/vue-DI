

let activeEffect

const effectStack = []
function effect( fn, options = {} ) {
    const effectFn = () => {
        cleanup( effectFn )
        activeEffect = effectFn
        effectStack.push( effectFn )
        // 将 fn 的执行结果储存到 res 中
        const res = fn()
        effectStack.pop()
        activeEffect = effectStack[ effectStack.length - 1 ]
        // 将 res 作为 effectFn 的返回值
        return res
    }

    effectFn.options = options
    effectFn.deps = []

    // 只有非 lazy 的时候，才执行
    if( !options.lazy ) {
        effectFn()
    }

    // 将副作用函数作为返回值返回
    return effectFn
}

function computed( getter ) {
    let value,dirty = true

    // 把 getter 作为副作用函数，创建一个 lazy 的 effect
    const effectFn = effect( getter,{
        lazy:true,
        scheduler:function(){
            dirty = true
            // 当计算属性依赖发生变化时，手动调用 trigger 函数触发响应
            trigger( obj,"value" )
        }
    } )

    const obj = {
        // 将读取 value 的时候才执行 effectFn
        get value() {
            if( dirty ) {
                value = effectFn()
                dirty = false
            }
            // 读取 value 时，手动调用 track 函数进行追踪
            tarck( obj,"value" )
            return value
        }
    }

    return obj
}

const bucket = new WeakMap()
const data = { foo:1,bar:2 }
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
    
    const effectsToRun = new Set()
    effects && effects.forEach( effectFn => {
        if( effectFn !== activeEffect ) {
            effectsToRun.add( effectFn )
        }
    } )

    effectsToRun.forEach( effectFn => {
        if( effectFn.options.scheduler ) {
            effectFn.options.scheduler( effectFn )
        } else {
            effectFn()
        }
    } )
}

function cleanup( effectFn ){
    // 便利 effectFn.deps 数据
    for( let i=0;i< effectFn.deps.length;i++ ) {
        const deps = effectFn.deps[i]
        deps.delete( effectFn )
    }

    effectFn.deps.length = 0
}

// 定义一个任务队列
const jobQueue = new Set()
// 使用 Promise.resolve() 创建一个 Promise 实例，用它将一个任务添加到微任务队列
const p = Promise.resolve()
// 一个标志，代表是否正在刷新队列
let isFlushing = false

function flushJob() {
    // 如果队列正在刷新，什么也不要做
    if( isFlushing ) return
    // 设置为 true，代表正在刷新
    isFlushing = true
    // 在微任务队列中刷新 jobQueue 队列
    p.then( () => {
        jobQueue.forEach( job => job() )
    } ).finally( () => {
        // 结束后重置 isFlushing
        isFlushing = false
    } )
}

function watch( source,cb, options = {} ) {
    // 定义 getter
    let getter

    // 如果 source 是一个函数，说明用户传入的是 getter,直接把 source 赋值给 getter
    if( typeof source === 'function' ) {
        getter = source
    } else {
        // 否则按照原来的实现方式调用 traverse 递归的读取
        getter = () => traverse(source)
    }

    // 定义旧值和新值
    let oldValue,newValue

    // cleanup 用来存储用户注册的过期回调
    let cleanup
    function onInvalidate( fn ) {
        cleanup = fn
    }

    // 提取 scheduler 调度函数位一个独立的 job 函数
    const job = () => {
        // 在 scheduler 中重新执行副作用函数，得到新值
        newValue = effectFn()

        // 在调用回调函数 cb 之前，先调用过期回调
        if( cleanup ) {
            cleanup()
        }

        // 将 onInvalidate 作为第三个参数，以用户使用
        cb( newValue,oldValue,onInvalidate )
        // 更新旧值，不然下一次会拿到错误的旧值
        oldValue = newValue
    }

    // 使用 effect 注册副作用函数时，开启 lazy 选项，并把返回值储存到 effectFn 中，方便后续手动调用
    const effectFn = effect(
        () => getter(), // 执行 getter
        {
            lazy:true,
            scheduler:function() {
                if( options.flush === 'post' ){
                    const p = Promise.resolve()
                    p.then( job )
                } else {
                    job()
                }
            }
        }
    )

    if( options.immediate ){
        // 当 immediate 是 true 的时候立即执行 job,从而触发回调执行
        job()
    } else {
        // 手动调用副作用函数，拿到的值就是旧值
        oldValue = effectFn()
    }
}

function traverse( value, seen = new Set() ) {
    // 如果读取的数据是原始值，或者已经被读取了，就什么也不要做
    if( typeof value !== 'object' || value === null || seen.has( value ) ) return

    seen.add( value )

    for( const k in value ) {
        traverse( value[k],seen )
    }

    return value
}

let finalDate = null,index=0
watch( () => obj.foo, async ( newVal,oldVal,onInvalidate ) => {
    index++
    // 定义一个标志，代表当前副作用函数时候过期，默认为 false，代表没有过期
    let expried = false

    // 调用 onInvalidate 函数注册一个过期回调
    onInvalidate( () => {
        // 当过期时，将 expried 设置为 false
        expried = true
    } )

    const res = await getRes()
    // 只有当副作用函数的执行没有过期时，才会执行后续操作
    if( !expried ) {
        console.log( res )
        finalDate = res
    }
}  )

function getRes() {
    return new Promise( ( resolve,reject ) => {
        setTimeout( () => {
            resolve(`res => ${index}`)
        },1000 )
    } )
}

obj.foo++

setTimeout( () => {
    obj.foo++
},200 )