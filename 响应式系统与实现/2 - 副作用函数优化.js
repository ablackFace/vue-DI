/** 响应式系统的工作流程
 *  - 当读取操作发生时,将副作用函数收集到 "桶" 中
 *  - 当设置操作发生时,从 "桶" 中取出副作用函数并执行
 */

/** 当前设计的缺点
 *  - 只能固定副作用的函数名,如果副作用不是 effect 函数的时候,响应式系统就不能正确的执行
 *  如何解决???
 *  - 创建一个用来注册副作用的函数
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

const bucket = new Set()
const data = {  text:"hello Vue3" }
const obj = new Proxy( data,{
    get:function( target,key ){
        if( activeEffect ) {
            bucket.add( activeEffect )
        }
        return target[key]
    },
    set:function( target,key,newVal ){
        target[key] = newVal
        bucket.forEach( Fn => Fn() )
        return true
    }
} )

effect( () => {
    console.log( "effect fun" );
    document.body.innerHTML = obj.text
} )
// setTimeout( () => {
//     obj.text = "触发副作用函数"
// },1000 )

/** 设计缺陷
 *  - 当添加一个新的属性时，会重新执行副作用函数
 *  - obj.notExist 并没有与副作用建立响应式联系
 *  - 所以，当执行 obj.notExist 设置操作的时候，不应该执行 副作用函数
 */
setTimeout( () => {
    obj.notExist = "Hello Vue3"
},1000 )