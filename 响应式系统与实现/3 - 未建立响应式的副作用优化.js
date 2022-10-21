/** 当前设计的缺点
 *  - 当未建立响应式联系的时候，副作用函数同样会执行
 *  如何解决???
 *  - 重新设计数据结构，在副作用和被操作的字段建立联系
 */



/** 副作用和响应式之间的联系
 * 
 *  effect( function effectFn(){
 *      document.body.innerHTML = obj.text
 *  } )
 *  
 * - 被读取的代理对象 obj
 * - 被读取的字段 text
 * - 使用 effect 函数注册的副作用函数 effectFn
 * 
 * target
 *   └── key
 *       └── effectFn
 */

// 创建一个全局变量用来储存被注册的副作用函数
let activeEffect
// effect 函数用于注册副作用函数
function effect( fn ) {
    // 当调用 effect 注册副作用函数的时候,将副作用函数 fn 赋值给 activeEffect
    activeEffect = fn
    // 执行 副作用函数
    fn()
}


/** 创建一个新的 "桶" 来关联响应式的联系，使用 weakMap 来代理 Set
 *   - WeakMap 由 target --> Map 构成
 *      - key:target value:Map
 *   - Map 由 key --> Set 构成
 *      - key:key value:Set
 */
const bucket = new WeakMap()
const data = {  text:"hello Vue3" }
const obj = new Proxy( data,{
    get:function( target,key ){
        // 如果没有注册副作用函数，直接 return
        if( !activeEffect ) return target[key]

        // 根据 target 从 "桶" 中取得 depsMap，他是一个 Map 类型：key --> effects
        let depsMap = bucket.get( target )
        // 如果不存在 depsMap，新建一个 Map 并和 target 关联
        if( !depsMap ) {
            bucket.set( target,( depsMap = new Map() ) )
        }
        
        // 再根据 key 从 depsMap 中取得 deps，他是一个 Set 类型
        // 里面储存着所有与当前 key 相关联的副作用函数：effects
        let deps = depsMap.get( key )
        // 如果 deps 不存在，创建一个 Set 和 key 关联
        if( !deps ) {
            depsMap.set( key,( deps = new Set() ) )
        }
        // 最后将当前激活的副作用函数添加到 "桶" 中
        deps.add( activeEffect )

        return target[key]
    },
    set:function( target,key,newVal ){
        target[key] = newVal

        // 根据 target 从桶中取得 depsMap，他是 key --> effects
        const depsMap = bucket.get( target )
        if( !depsMap ) return
        // 根据 key 取得所有副作用函数 effects
        const effects = depsMap.get( key )
        // 执行副作用函数
        effects && effects.forEach( fn => fn() )
    }
} )

effect( () => {
    console.log("effect run");
    document.body.innerHTML = obj.text
} )

setTimeout( () => {
    obj.notExist = "Hello Vue3"
},1000 )