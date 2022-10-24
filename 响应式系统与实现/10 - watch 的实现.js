/** watch 监听属性变化
 * watch 本质上是观察一个响应式数据，当数据变化时通知并执行相应的回调函数
 *              watch( obj.foo,() => console.log("数据变了") )
 *              obj.foo++
 *      本质就是调用 effect 以及 options.scheduler 选项
 *              effect(
 *                  () => console.log(obj.foo),
 *                  { scheduler() { // 当 obj.foo 的值变化的时候，执行 scheduler 调度函数 } }
 *              )
 *          在以上的代码中，我们只能实现 obj.foo 的监听，我们需要让 watch 函数具备通用性
 *          为此，我们需要封装一个通用的读取操作
 *      如何实现 ？？？
 *          - 在 watch 内部中的 effect 调用 traverse 函数递归读取，代替硬编码操作
 *          - 在 watch 的第一参数中，传入一个 getter 函数，从而指定 watch 进行依赖收集
 */



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

function watch( source,cb ) {
    // 定义 getter
    let getter

    // 如果 source 是一个函数，说明用户传入的是 getter,直接把 source 赋值给 getter
    if( typeof source === 'function' ) {
        getter = source
    } else {
        // 否则按照原来的实现方式调用 traverse 递归的读取
        getter = () => traverse(source)
    }
    
    effect(
        () => getter(), // 执行 getter
        {
            scheduler(){
                cb()
            }
        }
    )
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

// watch( obj,() => console.log("数据变化了") )
// obj.foo ++

// watch( obj,() => {
//     console.log("数据变化了")
// } )
// obj.foo ++

watch( () => obj.foo,() => {
    console.log("数据变化了")
} )
obj.foo ++