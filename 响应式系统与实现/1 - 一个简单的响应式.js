/** 如何把数据变成响应式？？？
 *  - 当副作用 effect 执行时，会触发字段 obj.text 的读取操作
 *  - 当修该 obj.text 的值是，会触发字段 obj.text 的设置操作
 *  - 采用 Proxy 对象进行拦截
 */
// 1 - 创建一个用来存储副作用函数的桶
const bucket = new Set()
// 2 - 创建一个原始数据
const data = {  text:"hello Vue3" }
// 3 - 对原始数据进行 Proxy 代理
const obj = new Proxy( data,{
    // 读取操作
    get:function( target,key ){
        // 4 - 当有数据执行了读取操作的时候,把副作用函数存放到桶里面
        bucket.add( effect )
        return target[key]
    },
    // 设置操作
    set:function( target,key,newVal ){
        target[key] = newVal
        // 5 - 当数据发生变化的时候,我们把副作用函数取出执行
        bucket.forEach( Fn => Fn() )
        return true
    }
} )

/** 什么是副作用函数
 *  - 当调用 `effect` 函数时，会设置 `body` 的文本内容
 *  - effect 函数的执行会间接影响到其他函数的执行，这个时候我们就可以说 effect 是一个副作用函数
 */
 function effect(){
    document.body.innerHTML = obj.text
}

effect()

setTimeout( () => {
    obj.text = "触发副作用函数"
},1000 )

/** 设计优化
 *  - 优化不需要传入 effect 的固定函数来出发副作用
 *  - 优化任何一个函数都可以出发副作用
 */