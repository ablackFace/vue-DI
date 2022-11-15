let activeEffect

const effectStack = []
function effect( fn, options = {} ) {
    const effectFn = () => {
        cleanup( effectFn )
        activeEffect = effectFn
        effectStack.push( effectFn )
        const res = fn()
        effectStack.pop()
        activeEffect = effectStack[ effectStack.length - 1 ]
        return res
    }

    effectFn.options = options
    effectFn.deps = []

    if( !options.lazy ) {
        effectFn()
    }

    return effectFn
}

function computed( getter ) {
    let value,dirty = true

    const effectFn = effect( getter,{
        lazy:true,
        scheduler:function(){
            dirty = true
            trigger( obj,"value" )
        }
    } )

    const obj = {
        get value() {
            if( dirty ) {
                value = effectFn()
                dirty = false
            }
            tarck( obj,"value" )
            return value
        }
    }

    return obj
}

const arrayInstrumentations = {};

["includes","indexOf","lastIndexOf"].forEach( method => {
    const originMethod = Array.prototype[method]
    arrayInstrumentations[method] = function( ...args ) {
        // this 是代理对象，先在代理对象中查找，将结果储存到 res
        let res = originMethod.apply( this,args )

        // 如果 res 没找到，通过 this.raw 继续查找
        if( res === false || res === -1 ) {
            res = originMethod.apply( this.raw,args )
        }

        // 最终结果
        return res
    }
} )

// 标记变量，代表是否进行追踪
let shouldTrack = true;
// 重写数组 push 方法
["push","pop","shift","unshift","splice"].forEach( method => {
    // 获取原始方法
    const originMethod = Array.prototype[method]
    // 重写方法
    arrayInstrumentations[method] = function( ...args ) {
        // 调用原始方法之前，禁止追踪
        shouldTrack = false
        // push 方法的默认行为
        let res = originMethod.apply( this,args )
        // 调用方法结束后，恢复原来的行为，允许追踪
        shouldTrack = true
        return res
    }
} )

const bucket = new WeakMap()
const ITERATE_KEY = Symbol()
function createReactive( data,isShallow = false,isReadOnly = false ) {
    return new Proxy( data,{
        get:function( target,key,receiver ){
            console.log("get:",key)

            // 如果读取的 size 属性
            if( key === "size" ) {
                // 指定第三个参数 receiver 为 target
                return Reflect.get( target,key,target )
            }

            // 代理对象可以通过 raw 属性访问原始数据
            if( key === 'raw' ) {
                return target
            }

            // 如果操作的对象是数组，并且 key 在 arrayInstrumentations 上
            // 那么就返回定义在 arrayInstrumentations 上的值
            if( Array.isArray( target ) && arrayInstrumentations.hasOwnProperty( key ) ) {
                return Reflect.get( arrayInstrumentations,key,receiver )
            }

            // 添加判断，如果 key 的类型是 symbol，则不进行追踪
            if( !isReadOnly && typeof key !== "symbol" ) {
                tarck( target,key )
            }

            // 得到原始值结果
            const res = Reflect.get( target,key,receiver )

            // 如果是浅响应,直接返回数据
            if( isShallow ){
                return res
            }

            if( typeof res === "object" && res !== null ) {
                return isReadOnly ? readonly(res) : reactive( res )
            }
            return res
        },
        set:function( target,key,newVal,receiver ){
            if( isReadOnly ) {
                console.warn( `属性 ${key} 是只读的` )
                return true
            }

            const oldVal = target[key]
            
            const type =  Array.isArray( target ) 
                ? Number(key) < target.length ? "SET" : "ADD"
                : Object.prototype.hasOwnProperty.call( target,key ) ? "SET" : "ADD"
    
            const res = Reflect.set( target,key,newVal,receiver )

            if( target === receiver.raw ){
                if( oldVal !== newVal && ( oldVal === oldVal || newVal === newVal ) ) {
                    // 增加第四个参数，即触发响应的新值
                    trigger( target,key,type,newVal )
                }
            }
            
            return res
        },
        deleteProperty:function( target,key ) {
            // 如果是只读的，打印警告信息并返回
            if( isReadOnly ) {
                console.warn( `属性 ${key} 是只读的` )
                return true
            }
            // 检测被操作的属性是否在对象上存在
            const hasKey = Object.prototype.hasOwnProperty.call( target,key )
            // 利用 Reflect.deleProperty 完成属性的删除
            const res = Reflect.deleteProperty( target,key )
    
            if( hasKey && res ) {
                // 只有存在被删除的属性时并且成功删除时,才触发更新
                trigger( target,key,"DELETE" )
            }
            return res
        },
        has:function( target,key ) {
            tarck( target,key )
            return Reflect.has( target,key )
        },
        ownKeys:function( target ) {
            // 如果操作对象是数组，则使用 length 属性作为 key 并建立响应联系
            tarck( target, Array.isArray(target) ? 'length' : ITERATE_KEY )
            return Reflect.ownKeys( target )
        }
    } )
}

const reactiveMap = new Map()
function reactive( obj ) {
    const existionsProxy = reactiveMap.get( obj )
    if( existionsProxy ) return existionsProxy

    const proxy = createReactive( obj )
    reactiveMap.set( obj,proxy )

    return proxy
}

function shallowReactive( data ) {
    return createReactive( data,true )
}

function readonly( data ) {
    return createReactive( data,false,true )
}

function shallowReadonly( data ) {
    return createReactive( data,true,true )
}

function tarck( target,key ) {
    // 禁止追踪时，return
    if( !activeEffect || !shouldTrack ) return

    let depsMap = bucket.get( target )
    if( !depsMap ) {
        bucket.set( target,( depsMap = new Map() ) )
    }

    let deps = depsMap.get( key )
    if( !deps ) {
        depsMap.set( key,( deps = new Set() ) )
    }

    deps.add( activeEffect )
    activeEffect.deps.push( deps )
}

function trigger( target,key,type,newVal ) {
    const depsMap = bucket.get( target )
    if( !depsMap ) return
    const effects = depsMap.get( key )
    
    const effectsToRun = new Set()
    effects && effects.forEach( effectFn => {
        if( effectFn !== activeEffect ) {
            effectsToRun.add( effectFn )
        }
    } )

    if( type === "ADD" || type === "DELETE" ) {
        const iterateEffects = depsMap.get( ITERATE_KEY )
        iterateEffects && iterateEffects.forEach( effectFn => {
            if( effectFn !== activeEffect ) {
                effectsToRun.add( effectFn )
            }
        } )
    }

    if( type === "ADD" && Array.isArray( target ) ) {
        const lengthEffects = depsMap.get("length")
        lengthEffects && lengthEffects.forEach( effectFn => {
            if( effectFn !== activeEffect ) {
                effectsToRun.add( effectFn )
            }
        } )
    }

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

function cleanup( effectFn ){
    for( let i=0;i< effectFn.deps.length;i++ ) {
        const deps = effectFn.deps[i]
        deps.delete( effectFn )
    }

    effectFn.deps.length = 0
}

const jobQueue = new Set()
const p = Promise.resolve()
let isFlushing = false

function flushJob() {
    if( isFlushing ) return
    isFlushing = true
    p.then( () => {
        jobQueue.forEach( job => job() )
    } ).finally( () => {
        isFlushing = false
    } )
}

function watch( source,cb, options = {} ) {
    let getter

    if( typeof source === 'function' ) {
        getter = source
    } else {
        getter = () => traverse(source)
    }

    let oldValue,newValue

    let cleanup
    function onInvalidate( fn ) {
        cleanup = fn
    }

    const job = () => {
        newValue = effectFn()

        if( cleanup ) {
            cleanup()
        }

        cb( newValue,oldValue,onInvalidate )
        oldValue = newValue
    }

    const effectFn = effect(
        () => getter(),
        {
            lazy:true,
            scheduler:function() {
                if( options.flush === 'post' ){
                    const p = Promise.resolve()
                    p.then( job )
                } else {
                    job()
                }
            }
        }
    )

    if( options.immediate ){
        job()
    } else {
        oldValue = effectFn()
    }
}

function traverse( value, seen = new Set() ) {
    if( typeof value !== 'object' || value === null || seen.has( value ) ) return

    seen.add( value )

    for( const k in value ) {
        traverse( value[k],seen )
    }

    return value
}

module.exports = {
    reactive,
    shallowReactive,
    readonly,
    shallowReadonly,
    computed,
    effect,
    watch,
    flushJob
}