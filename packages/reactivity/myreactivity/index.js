import { isArray } from '../../shared/dist/shared.cjs.prod'
import { isObject } from '../../shared/index'

/**
 * mutableHandlers 可变处理
 * baseHandlers.ts // 基本类型的处理器
 */
// const mutableHandlers = {
//   // 代理相关逻辑
// }

//! 1.创建响应式对象
export function reactive(target) {
  // 1. 创建响应式对象
  return createReactiveObject(target, mutableHandlers)
}

// 2. 缓存代理过的对象
export const reactiveMap = new WeakMap()
function createReactiveObject(target, baseHandlers) {
  // 如果不是对象，直接返回
  if (!isObject(target)) {
    return target
  }
  const proxyMap = reactiveMap
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // 3. 对数据进行代理
  const proxy = new Proxy(target, baseHandlers)
  // 4. 保存代理对象
  proxyMap.set(target, proxy)
}

//* reactive 函数核心就是使用 proxy 对对象进行拦截，这里并没有使用递归。

// ! 代理逻辑的编写
function createGetter() {
  // proxy 对应的get方法
  return function get(target, key, receiver) {
    const res = Reflect.get(target, key, receiver)
    if (typeof key == 'symbol') {
      return res
    }
    console.log('调用get方法') // 拦截get方法
    if (isObject(res)) {
      return reactive(res)
    }
    return res
  }
}

function createSetter() {
  // proxy 对应的set方法
  return function set(target, key, value, receiver) {
    const oldValue = target[key]
    const hadKey =
      isArray(target) && '' + parseInt(key, 10) === key
        ? Number(key) < target.length
        : hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)
    if (!hadKey) {
      // 拦截set方法
      console.log('增加属性')
    } else if (hasChanged(value, oldValue)) {
      console.log('修改属性')
    }
    return result
  }
}

const get = createGetter()
const set = createSetter()

export const mutableHandlers = {
  // 代理相关逻辑
  get,
  set
}
