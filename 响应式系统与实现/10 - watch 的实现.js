/** watch 监听属性变化
 * watch 本质上是观察一个响应式数据，当数据变化时通知并执行相应的回调函数
 *          watch( obj.foo,() => console.log("数据变了") )
 *          obj.foo++
 *      本质就是调用 effect 以及 options.scheduler 选项
 */

