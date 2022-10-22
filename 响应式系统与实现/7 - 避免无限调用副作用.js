/** 避免无限递归调用副作用
 * 当前的代码缺陷
 *      const obj = { foo:0 }
 *      effect( () => obj.foo ++ )
 *      当我们去注册副作用函数的时候，函数内部有一个 obj.foo++ 的操作
 *      该函数会引起栈的溢出：Uncaught RangeError: Maximum call stack size exceeded
 * 问题出现在哪里 ？？？
 *      在当前的 effect( () => obj.foo ++ ) 语句中，我们可以这样理解
 *          effect( () => {
 *              obj.foo = obj.foo + 1
 *          } )
 *      在当前的语句中，我们即读取了值，也设置了值，从而导致出现栈溢出的根本原因
 *          - 当读取 obj.foo 值的时候，会触发 track 操作，将当前的副作用收集到 "桶" 中
 *          - 之后对 obj.foo 进行一个累计 +1 的操作，会触发 trigger 操作，把 "桶" 中的副作用函数取出并执行
 *      问题原因：在副作用正在执行的时候，还没有执行完毕，就要开始执行下一次的执行。就会导致无限递归调用自己，从而引发栈溢出
 * 如何解决当前的问题 ？？？
 *      - 在当前的问题中，无论我们是触发 track 和 trigger 函数，都是调用的一个 副作用函数 activeEffect
 *      - 在 trigger 动作即将发生的时候，增加一个守卫条件
 *          如果 trigger 触发执行的副作用函数正在与当前正在执行的副作用函数相同，就不触发执行
 */


let activeEffect

const effectStack = []
function effect( fn ) {
    const effectFn = () => {
        cleanup( effectFn )
        // 当调用 effect 注册副作用函数时，将副作用函数赋值给 activeEffect
        activeEffect = effectFn
        // 在调用副作用函数时，将当前的副作用函数压入栈中
        effectStack.push( effectFn )
        fn()
        // 当前的副作用函数调用完毕之后，弹出栈并把 activeEffect 还原为之前的值
        effectStack.pop()
        activeEffect = effectStack[ effectStack.length - 1 ]
    }

    effectFn.deps = []
    effectFn()
}
 
 
const bucket = new WeakMap()
const data = { foo:0 }
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

    // 把当前激活的副作用函数添加到依赖集合 deps 中
    deps.add( activeEffect )
    // deps 是一个与当前副作用函数存在联系的依赖集合
    // 将其添加到 activeEffect.deps 数据里面
    activeEffect.deps.push( deps )
}

// 在 set 拦截函数内调用 trigger 函数触发变化
function trigger( target,key ) {
    const depsMap = bucket.get( target )
    if( !depsMap ) return
    const effects = depsMap.get( key )
    
    const effectsToRun = new Set()
    effects && effects.forEach( effectFn => {
        // 如果 trigger 触发执行的副作用函数与当前的正在执行的副作用函数相同，则不触发执行
        if( effectFn !== activeEffect ) {
            effectsToRun.add( effectFn )
        }
    } )

    effectsToRun.forEach( effectFn => effectFn() )
}

function cleanup( effectFn ){
    // 便利 effectFn.deps 数据
    for( let i=0;i< effectFn.deps.length;i++ ) {
        const deps = effectFn.deps[i]   // deps 是依赖集合
        deps.delete( effectFn )         // 将 effectFn 从依赖集合中删除
    }

    effectFn.deps.length = 0            // 最后清空 effectFn.deps 数据
}

effect( () => obj.foo++ )