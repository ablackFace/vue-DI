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

### 索引

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

### length

在副作用函数内访问了数组的第 0 个元素，接着将数组的length 属性修改为 0。

```js
const { reactive, effect } = require("./reactive")

const date = reactive(["foo"])

effect( () => {
    console.log( "effect=>",date[0] )
} )

date.length = 0
```

并非所有对 length 属性的修改都会影响数组中的已有元素，拿上例来说，如果我们将 length 属性设置为 100，这并不会影响第 0 个元素，所以也就不需要触发副作用函数重新执行。

**当修改 length 属性值时，只有那些索引值大于或等于新的 length 属性值的元素才需要触发响应。**

修改 set 拦截函数。在调用 trigger 函数触发响应时，应该把新的属性值传递过去：

```js
set:function( target,key,newVal,receiver ){
	// ...

	if( target === receiver.raw ){
        if( oldVal !== newVal && ( oldVal === oldVal || newVal === newVal ) ) {
            // 增加第四个参数，即触发响应的新值
            trigger( target,key,type,newVal )
        }
    }

	// ...
}
```

修改 trigger 函数，为 trigger 函数增加了第四个参数，即触发响应时的新值：

```js
function trigger( target,key,type,newVal ) {
    const depsMap = bucket.get( target )
    if( !depsMap ) return
    const effects = depsMap.get( key )
    
    const effectsToRun = new Set()
    
    //...

    // 如果操作目标时数组，并且修改了数组的 length 属性
    if( Array.isArray( target ) && key === "length" ) {
        // 对于索引大于或等于新的 length 时，
        // 需要把所有相关联的副作用函数取出并添加到 effectsToRun 中待执行
        depsMap.forEach( ( effects,key ) => {
            if( key >= newVal ) {
                effects.forEach( effectFn => {
                    if( effectFn !== activeEffect ) {
                        effectsToRun.add( effectFn )
                    }
                } )
            }
        } )
    }

    effectsToRun.forEach( effectFn => {
        if( effectFn.options.scheduler ) {
            effectFn.options.scheduler( effectFn )
        } else {
            effectFn()
        }
    } )
}
```

新值指的是新的 length 属性值，它代表新的数组长度。接着，我们判断操作的目标是否是数组，如果是，则需要找到所有索引值大于或等于新的 length 值的元素，然后把与它们相关联的副作用函数取出并执行。
