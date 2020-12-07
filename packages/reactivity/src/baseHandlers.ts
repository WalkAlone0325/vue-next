import {
  reactive,
  readonly,
  toRaw,
  ReactiveFlags,
  Target,
  readonlyMap,
  reactiveMap
} from './reactive'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import {
  track,
  trigger,
  ITERATE_KEY,
  pauseTracking,
  resetTracking
} from './effect'
import {
  isObject,
  hasOwn,
  isSymbol,
  hasChanged,
  isArray,
  isIntegerKey,
  extend
} from '@vue/shared'
import { isRef } from './ref'

const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)

const get = /*#__PURE__*/ createGetter()
const shallowGet = /*#__PURE__*/ createGetter(false, true)
const readonlyGet = /*#__PURE__*/ createGetter(true)
const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true)

const arrayInstrumentations: Record<string, Function> = {}
// instrument identity-sensitive Array methods to account for possible reactive
// values
;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
  const method = Array.prototype[key] as any
  arrayInstrumentations[key] = function(this: unknown[], ...args: unknown[]) {
    const arr = toRaw(this)
    for (let i = 0, l = this.length; i < l; i++) {
      track(arr, TrackOpTypes.GET, i + '')
    }
    // we run the method using the original args first (which may be reactive)
    const res = method.apply(arr, args)
    if (res === -1 || res === false) {
      // if that didn't work, run it again using raw values.
      return method.apply(arr, args.map(toRaw))
    } else {
      return res
    }
  }
})
// instrument length-altering mutation methods to avoid length being tracked
// which leads to infinite loops in some cases (#2137)
;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
  const method = Array.prototype[key] as any
  arrayInstrumentations[key] = function(this: unknown[], ...args: unknown[]) {
    pauseTracking()
    const res = method.apply(this, args)
    resetTracking()
    return res
  }
})

/**
 * @description: 用于拦截对象的读取属性操作
 * @param {isReadonly} 是否只读
 * @param {shallow} 是否浅观察
 */
function createGetter(isReadonly = false, shallow = false) {
  /**
   * @description:
   * @param {target} 目标对象
   * @param {key} 需要获取的值的键值
   * @param {receiver} 如果遇到 setter，receiver则为setter调用时的this值
   */
  return function get(target: Target, key: string | symbol, receiver: object) {
    //  ReactiveFlags 是在reactive中声明的枚举值，
    // 如果key是枚举值则直接返回对应的布尔值
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (
      key === ReactiveFlags.RAW &&
      receiver === (isReadonly ? readonlyMap : reactiveMap).get(target)
    ) {
      // 如果key是raw 则直接返回目标对象
      return target
    }

    const targetIsArray = isArray(target)

    // 如果目标对象是数组并且 key 属于三个方法之一 ['includes', 'indexOf', 'lastIndexOf']，即触发了这三个操作之一
    if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }

    const res = Reflect.get(target, key, receiver)

    // 如果 key 是 symbol 内置方法，或者访问的是原型对象，直接返回结果，不收集依赖
    if (
      isSymbol(key)
        ? builtInSymbols.has(key as symbol)
        : key === `__proto__` || key === `__v_isRef`
    ) {
      return res
    }

    // 目标对象不为只读则调用 track Get
    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }

    // 如果是浅观察并且不为只读则调用 track Get, 并返回结果
    if (shallow) {
      return res
    }

    // 如果get的结果是ref
    if (isRef(res)) {
      // ref unwrapping - does not apply for Array + integer key.
      const shouldUnwrap = !targetIsArray || !isIntegerKey(key)
      return shouldUnwrap ? res.value : res
    }

    if (isObject(res)) {
      // Convert returned value into a proxy as well. we do the isObject check
      // here to avoid invalid value warning. Also need to lazy access readonly
      // and reactive here to avoid circular dependency.
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}

const set = /*#__PURE__*/ createSetter()
const shallowSet = /*#__PURE__*/ createSetter(true)

/**
 * @description: 拦截对象的设置属性操作
 * @param {shallow} 是否是浅观察
 */
function createSetter(shallow = false) {
  /**
   * @description:
   * @param {target} 目标对象
   * @param {key} 设置的属性的名称
   * @param {value} 要改变的属性值
   * @param {receiver} 如果遇到 setter，receiver则为setter调用时的this值
   */
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    const oldValue = (target as any)[key]

    // 如果模式不是浅观察
    if (!shallow) {
      value = toRaw(value)
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      }
    } else {
      //在浅模式下，无论是否响应，对象都按原样设置
      // in shallow mode, objects are set as-is regardless of reactive or not
    }

    // 检查对象是否有这个属性
    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)
    // don't trigger if target is something up in the prototype chain of original
    //如果目标位于原始原型链中，则不要触发
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        // 如是不存在则trigger ADD
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        // 存在则trigger SET
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    return result
  }
}

/**
 * @description: 用于拦截对象的删除属性操作
 * @param {target} 目标对象
 * @param {key} 键值
 * @return {Boolean}
 */
function deleteProperty(target: object, key: string | symbol): boolean {
  // hasOwn 的实现放下方了，检查一个对象是否包含当前key
  const hadKey = hasOwn(target, key)
  const oldValue = (target as any)[key]
  // Reflect 作用在于完成目标对象的默认，这里即指删除
  const result = Reflect.deleteProperty(target, key)
  // 如果该值被成功删除则调用 trigger,
  // trigger 为 effect 里的方法，effect 为 reactive 的核心, 后面会讲到
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  return result
}

/**
 * @description: 检查一个对象是否拥有某个属性
 * @param {target} 目标对象
 * @param {key} 键值
 * @return {Boolean}
 */
function has(target: object, key: string | symbol): boolean {
  const result = Reflect.has(target, key)
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    // track
    track(target, TrackOpTypes.HAS, key)
  }
  return result
}

// 返回一个由目标对象自身的属性键组成的数组
function ownKeys(target: object): (string | number | symbol)[] {
  track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY)
  return Reflect.ownKeys(target)
}

// 可变处理
// 参数：
// 用于拦截对象的读取属性操作
// 用于拦截对象的设置属性操作
// 用于拦截对象的删除属性操作
// 检查一个对象是否拥有某个属性
// 针对 getOwnPropertyNames,  getOwnPropertySymbols, keys 的代理方法
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys
}

// 只读处理
export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  set(target, key) {
    if (__DEV__) {
      console.warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  },
  deleteProperty(target, key) {
    if (__DEV__) {
      console.warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  }
}

//  浅观察处理（只观察目标对象的第一层属性）
export const shallowReactiveHandlers: ProxyHandler<object> = extend(
  {},
  mutableHandlers,
  {
    get: shallowGet,
    set: shallowSet
  }
)

// Props handlers are special in the sense that it should not unwrap top-level
// refs (in order to allow refs to be explicitly passed down), but should
// retain the reactivity of the normal readonly object.
// 浅观察 && 只读处理
export const shallowReadonlyHandlers: ProxyHandler<object> = extend(
  {},
  readonlyHandlers,
  {
    get: shallowReadonlyGet
  }
)
