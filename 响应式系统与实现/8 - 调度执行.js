/** 调度执行
 * 什么时可调度 ？？？
 *      可调度，指当 trigger 动作触发副作用函数重新执行时，有能力决定副作用函数执行的时机，次数以及方式
 *              const obj = { foo:1 }
 *              effect( () => console.log(obj.foo) )
 *              obj.foo++
 *              console.log("执行结束")
 *         在当前的代码下，我们可以清晰的看出他的打印顺序
 *         // -> 1                                  // -> 1
 *         // -> 2             <=== 需求有变 ===>   // -> 执行结束
 *         // -> 执行结束                           // -> 2
 * 如何实现 ？？？
 *      给 effect 函数设计一个选项参数 options,允许用户指定调度器：
 *              effect(
 *                  () => console.log(obj.foo),
 *                  // options
 *                  {
 *                      scheduler( fn ) { ... }
 *                  }
 *              )
 */

 let activeEffect

 const effectStack = []
 function effect( fn, options = {} ) {
     const effectFn = () => {
         cleanup( effectFn )
         activeEffect = effectFn
         effectStack.push( effectFn )
         fn()
         effectStack.pop()
         activeEffect = effectStack[ effectStack.length - 1 ]
     }
 
     effectFn.options = options
     effectFn.deps = []
     effectFn()
 }
  
  
 const bucket = new WeakMap()
 const data = { foo:1 }
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

effect(
    () => console.log(obj.foo),
    {
        scheduler(fn) {
            fn && fn()
        }
    }
)
obj.foo++
console.log("执行结束")