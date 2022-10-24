/** computed 和 lazy
 * 什么是懒执行的 effect,及 lazy 的 effect ？？？
 *      在下面的例子中，我们调用一个 effect 来注册一个副作用
 *              effect( () => console.log( obj.foo ) )
 *          但是我并不希望它是立即执行的，而是在我有需要的时候执行，例如：computed
 *          这时候，我们就需要通过在 options 中添加 lazy 属性来达到下面的目的
 *              effect(
 *                  () => console.log( obj.foo ),
 *                  { lazy:true }
 *              )
 *      通过 options.lazy 可以让副作用函数不立即执行，但是，副作用函数因该什么时候执行 ？？？
 *          - 将副作用函数 effectFn 作为 effect 函数的返回值
 *          - 当调用 effect 函数时，拿到它的返回值，并且手动调用副作用函数
 *              const effectFn = effect(
 *                  () => console.log( obj.foo ),
 *                  { lazy:true }
 *              )
 *              effectFn()     
 *      仅仅能手动执行副作用函数意义不大，但是把传递给 effect 函数看作一个 getter,就可以实现一个简单的 computed
 *              const effectFn = effect(
 *                  // getter 返回 obj.foo 和 obj.bar 的和
 *                  () => obj.foo + obj.bar,
 *                  { lazy:true }
 *              )
 *              
 *              // value 是 getter 的返回值
 *              const value = effectFn()
 *          - 在此之前，我们实现计算属性的懒计算
 *          - 当读取计算值的时候，才会执行副作用函数，并返回结果值
 *      当时我们多次读取了 computed 的值，会导致 effectFn 多次计算，实际上 obj,foo 和 obj.bar 本身是没有变化的
 *              const sumRes = computed( () => obj.foo + obj.bar )
 *              console.log( sumRes.value )     // 3
 *              console.log( sumRes.value )     // 3
 *              console.log( sumRes.value )     // 3
 *          如何解决 ？？？
 *              - 在实现 computed 时，添加值的缓存
 *              - 定义两个变量 value 和 dirty，来表示上一次 计算的值 和 数据是否是脏数据并且是否需要重新计算
 *              - 在 scheduler 调度器中修改 dirty 变量的值，代表如何响应式数据发生变化，即数据为脏数据
 *      
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
        }
    } )

    const obj = {
        // 将读取 value 的时候才执行 effectFn
        get value() {
            if( dirty ) {
                value = effectFn()
                dirty = false
            }
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

// const sumRes = computed( () => obj.foo + obj.bar )
// console.log( sumRes.value )
// obj.foo ++ 
// console.log( sumRes.value )
// console.log( sumRes.value )

const sumRes = computed( () => obj.foo + obj.bar )
effect( () => console.log( sumRes.value ) )
obj.foo ++