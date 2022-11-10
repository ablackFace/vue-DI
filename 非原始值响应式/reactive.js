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

const bucket = new WeakMap()
const ITERATE_KEY = Symbol()
function createReactive( data,isShallow = false,isReadOnly = false ) {
    return new Proxy( data,{
        get:function( target,key,receiver ){

            // 代理对象可以通过 raw 属性访问原始数据
            if( key === 'raw' ) {
                return target
            }

            tarck( target,key )
            // 得到原始值结果
            const res = Reflect.get( target,key,receiver )

            // 如果是浅响应,直接返回数据
            if( isShallow ){
                return res
            }

            // 如果还是一个对象,递归 proxy
            if( typeof res === "object" && res !== null ) {
                return reactive( res )
            }
            return res
        },
        set:function( target,key,newVal,receiver ){
            // 如果是只读的，打印警告信息并返回
            if( isReadOnly ) {
                console.warn( `属性 ${key} 是只读的` )
                return true
            }

            // 获取旧值
            const oldVal = target[key]
    
            // 判断属性是否存在，并设置 type
            const type = Object.prototype.hasOwnProperty.call( target,key ) ? "SET" : "ADD"
    
            // 设置属性值
            const res = Reflect.set( target,key,newVal,receiver )

            // target === receiver.raw 说明 receiver 就是 target 的代理对象
            if( target === receiver.raw ){
                if( oldVal !== newVal && ( oldVal === oldVal || newVal === newVal ) ) {
                    trigger( target,key,type )
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
            // 将副作用函数与 ITERATE_KEY 关联
            tarck( target,ITERATE_KEY )
            return Reflect.ownKeys( target )
        }
    } )
}

function reactive( data ) {
    return createReactive( data )
}

function shallowReactive( data ) {
    return createReactive( data,true )
}

function readonly( data ) {
    return createReactive( data,false,true )
}

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

    deps.add( activeEffect )
    activeEffect.deps.push( deps )
}

function trigger( target,key,type ) {
    const depsMap = bucket.get( target )
    if( !depsMap ) return
    const effects = depsMap.get( key )
    
    const effectsToRun = new Set()
    effects && effects.forEach( effectFn => {
        if( effectFn !== activeEffect ) {
            effectsToRun.add( effectFn )
        }
    } )

    // 如果操作类型时 ADD 或者 DELETE，才触发 ITERATE_KEY 相关的副作用函数重新执行
    if( type === "ADD" || type === "DELETE" ) {
        // 取得与 ITERATE_KEY 关联的副作用函数
        const iterateEffects = depsMap.get( ITERATE_KEY )
        // 将与 ITERATE_KEY 相关联的副作用函数添加到 effectsToRun
        iterateEffects && iterateEffects.forEach( effectFn => {
            if( effectFn !== activeEffect ) {
                effectsToRun.add( effectFn )
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
    computed,
    effect,
    watch,
    flushJob
}