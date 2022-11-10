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
const data = {
    foo:1,
}
const obj = new Proxy( data,{
    get:function( target,key,receiver ){
        tarck( target,key )
        // 使用 Reflect.get 返回读取到的属性值
        return Reflect.get( target,key,receiver )
    },
    set:function( target,key,newVal ){
        target[key] = newVal
        trigger( target,key )
    },
    deleteProperty:function( target,key ) {
        return Reflect.deleteProperty( target,key )
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

function trigger( target,key ) {
    const depsMap = bucket.get( target )
    if( !depsMap ) return
    const effects = depsMap.get( key )
    
    const effectsToRun = new Set()
    effects && effects.forEach( effectFn => {
        if( effectFn !== activeEffect ) {
            effectsToRun.add( effectFn )
        }
    } )

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

effect( () => {
    console.log( "foo" in obj )
} )