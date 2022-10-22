/** effect 是可以嵌套的
 *      effect( function effectFn1(){
 *          effect( function effectFn2(){...} )
 *          ...
 *      } )
 * 当前代码缺陷
 *      const obj = { foo:true,bar:true }
 *      let temp1,temp2
 *      effect( function effectFn1(){
 *          console.log( "effectFn1 执行" )
 *          effect( function effectFn2(){
 *              console.log( "effectFn2 执行" )
 *              temp2 = obj.bar
 *          } )
 *          temp1 = obj.foo
 *      } )
 *      
 *      如果修改 foo 的值
 *      obj.foo = false
 *      // -> effectFn1 执行
 *      // -> effectFn2 执行
 *      // -> effectFn2 执行
 *      - 当我们去做嵌套的 effect 函数的时候，第一次会依次执行 effect 里面的副作用
 *      - 而去修改响应式的时候，会发现只执行了 effectFn2 函数，而 effectFn1 并没有重新执行
 * 问题出现在哪里 ？？？
 *      let activeEffect -> 同一个副作用函数的全局变量
 *      function effect( fn ) {
 *          const effectFn = () => {
 *              cleanup( effectFn )
 *              activeEffect = effectFn  -> 当我们使用全局变量 activeEffect 的时候，注册的副作用函数只能是一个
 *              fn()
 *          }
 *      
 *          effectFn.deps = []
 *          effectFn()
 *      }
 * 如何解决当前的问题 ？？？
 *      - 需要一个副作用函数栈 effectStack，当副作用执行时，将当前的副作用函数压入栈中
 *      - 当副作用执行完毕的时候，将当前执行完毕的副作用弹出
 *      - 始终让 activeEffect 指向栈顶的副作用函数
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
 const data = { foo:true,bar:true }
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
     
     // 处理 Set 无限递归问题
     const effectsToRun = new Set( effects )
     effectsToRun && effectsToRun.forEach( effectFn => effectFn() )
 }
 
 function cleanup( effectFn ){
     // 便利 effectFn.deps 数据
     for( let i=0;i< effectFn.deps.length;i++ ) {
         const deps = effectFn.deps[i]   // deps 是依赖集合
         deps.delete( effectFn )         // 将 effectFn 从依赖集合中删除
     }
 
     effectFn.deps.length = 0            // 最后清空 effectFn.deps 数据
 }

let temp1,temp2

effect( function effectFn1() {
    console.log( "effectFn1 执行" )

    effect( function effectFn2() {
        console.log( "effectFn2 执行" )
        temp2 = obj.bar
    } )

    temp1 = obj.foo
} )

setTimeout( () => {
    obj.foo = false
},1000 )