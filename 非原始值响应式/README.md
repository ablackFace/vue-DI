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
