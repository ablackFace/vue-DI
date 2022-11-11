# Proxy

`Proxy` 可以创建一个代理对象。他可以实现对其他对象的代理，也就是说，`Proxy` 只能代理对象，无法代理非对象。

例如：字符串，布尔值，数字。。。

## 什么是代理对象

所谓**代理**是对一个对象**基本语义**的代理。它允许我们拦截并**重新定义**对一个对象的基本操作。

**基本语义**，给出一个对象，可以对他进行一些操作，例如读取属性值，设置属性值：

```js
obj.foo  //读取属性值
obj.foo++ // 设置属性值
```

# 代理数组

```js
const { reactive, effect } = require("./reactive")

const date = reactive(["foo"])

effect( () => {
    console.log( "effect=>",date[0] )
} )

date[0] = "bar"
```

但对数组的操作与对普通对象的操作仍然存在不同，下面总结了所有对数组元素或属性的“读取”操作。

-  通过索引访问数组元素值：arr[0]。

-  访问数组的长度：arr.length。

-  把数组作为对象，使用 for...in 循环遍历。

- 使用 for...of 迭代遍历数组。

- 数组的原型方法，如 concat/join/every/some/find/findIndex/includes 等，

以及其他所有不改变原数组的原型方法。可以看到，对数组的读取操作要比普通对象丰富得多。我们再来看看对数组元素或属性的设置操作有哪些。

- 通过索引修改数组元素值：arr[1] = 3。

-  修改数组长度：arr.length = 0。

- 数组的栈方法：push/pop/shift/unshift。
- 修改原数组的原型方法：splice/fill/sort 等。

## 数组的索引与 length

```js
const date = reactive(["foo"])
date[1] = "bar"
```

如果设置的索引值大于数组当前的长度，那么要更新数组的 length 属性。

修改 set 拦截函数，如下面的代码所示：

```js
set:function( target,key,newVal,receiver ){
	// ...

	 // 判断代理目标是否是数组 (Array)
    const type =  Array.isArray( target ) 
    	// 如果代理目标是数组，则检测被设置的索引值是否小于数组长度
    	// 如果是，则视为 SET，否则是 ADD 操作
    	? Number(key) < target.length ? "SET" : "ADD"
    	: Object.prototype.hasOwnProperty.call( target,key ) ? "SET" : "ADD"

	// ...
}
```

在 trigger 函数中正确地触发与数组对象的 length 属性相关联的副作用函数重新执行了：

```js
function trigger( target,key,type ) {
    // ...
    
    // 当操作类型是 ADD 并且目标是数组时，取出并执行与 length 属性相关联的副作用函数
    if( type === "ADD" && Array.isArray( target ) ) {
        // 取出与 length 属性相关联的副作用函数
        const lengthEffects = depsMap.get("length")
        // 将这些副作用函数添加到 effectsToRun 中，待执行
        lengthEffects && lengthEffects.forEach( effectFn => {
            if( effectFn !== activeEffect ) {
                effectsToRun.add( effectFn )
            }
        } )
    }
    
    // ...
}
```

