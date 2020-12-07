import { TrackOpTypes, TriggerOpTypes } from './operations'
import { EMPTY_OBJ, isArray, isIntegerKey, isMap } from '@vue/shared'

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class
// which maintains a Set of subscribers, but we simply store them as
// raw Sets to reduce memory overhead.
type Dep = Set<ReactiveEffect>
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

export interface ReactiveEffect<T = any> {
  (): T
  _isEffect: true
  id: number
  active: boolean
  raw: () => T
  deps: Array<Dep>
  options: ReactiveEffectOptions
  allowRecurse: boolean
}

export interface ReactiveEffectOptions {
  lazy?: boolean //  是否延迟触发 effect
  scheduler?: (job: ReactiveEffect) => void // 调度函数
  onTrack?: (event: DebuggerEvent) => void // 追踪时触发
  onTrigger?: (event: DebuggerEvent) => void // 触发回调时触发
  onStop?: () => void // 停止监听时触发
  allowRecurse?: boolean // 是否允许递归
}

export type DebuggerEvent = {
  effect: ReactiveEffect
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key: any
} & DebuggerEventExtraInfo

export interface DebuggerEventExtraInfo {
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}

const effectStack: ReactiveEffect[] = []
let activeEffect: ReactiveEffect | undefined

export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? 'Map key iterate' : '')

export function isEffect(fn: any): fn is ReactiveEffect {
  return fn && fn._isEffect === true
}

/**
 * effect 函数
 * @param fn 回调函数
 * @param options 参数
 */
export function effect<T = any>(
  fn: () => T,
  options: ReactiveEffectOptions = EMPTY_OBJ
): ReactiveEffect<T> {
  // 如果已经是 `effect` 先重置为原始对象
  if (isEffect(fn)) {
    fn = fn.raw
  }
  // 创建 effect
  const effect = createReactiveEffect(fn, options)

  // 如果没有传入 lazy 则执行一次 effect
  if (!options.lazy) {
    effect()
  }
  return effect
}

export function stop(effect: ReactiveEffect) {
  if (effect.active) {
    cleanup(effect)
    if (effect.options.onStop) {
      effect.options.onStop()
    }
    effect.active = false
  }
}

let uid = 0

/**
 * 创建 effect 函数
 * @param fn 回调函数
 * @param options 参数
 */
function createReactiveEffect<T = any>(
  fn: () => T,
  options: ReactiveEffectOptions
): ReactiveEffect<T> {
  const effect = function reactiveEffect(): unknown {
    // 没有激活，说明我们调用了effect stop 函数，
    if (!effect.active) {
      // 如果没有调度者，直接返回，否则直接执行fn
      return options.scheduler ? undefined : fn()
    }

    // 判断effectStack中有没有effect, 如果在则不处理
    if (!effectStack.includes(effect)) {
      // 清除effect依赖，定义在下方
      cleanup(effect)
      try {
        // 开始重新收集依赖
        enableTracking()
        // 亚茹 Stack
        effectStack.push(effect)
        // 将 activeEffect 作为 effect
        activeEffect = effect
        return fn()
      } finally {
        // 完成后将effect弹出
        effectStack.pop()
        // 重置依赖
        resetTracking()
        // 重置activeEffect
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  } as ReactiveEffect
  effect.id = uid++ // 自增id, effect唯一标识
  effect.allowRecurse = !!options.allowRecurse // 是否允许递归
  effect._isEffect = true // 是否是effect
  effect.active = true // 是否激活
  effect.raw = fn // 挂载原始对象
  effect.deps = [] // 当前 effect 的dep 数组
  effect.options = options // 传入的options，在effect有解释的那个字段
  return effect
}

// 每次 effect 运行都会重新收集依赖,
// deps 是 effect 的依赖数组, 需要全部清空
function cleanup(effect: ReactiveEffect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

let shouldTrack = true
const trackStack: boolean[] = []

export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

export function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

export function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}
/**
 * track 收集依赖(get操作)
 * @param target 目标对象
 * @param type 收集的类型,  函数的定义在下方
 * @param key 触发 track 的 object 的 key
 */
export function track(target: object, type: TrackOpTypes, key: unknown) {
  // activeEffect为空代表没有依赖，直接return
  if (!shouldTrack || activeEffect === undefined) {
    return
  }

  // targetMap 依赖管理中心，用于收集依赖和触发依赖
  // 检查targetMap中有没有当前target
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    // 没有则新建一个
    targetMap.set(target, (depsMap = new Map()))
  }
  // deps 来收集依赖函数，当监听的 key 值发生变化时，触发 dep 中的依赖函数
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
    // 开发环境会触发onTrack, 仅用于调试
    if (__DEV__ && activeEffect.options.onTrack) {
      activeEffect.options.onTrack({
        effect: activeEffect,
        target,
        type,
        key
      })
    }
  }
}

/**
 * trigger 触发依赖(触发更新后执行监听函数之前触发)
 * @param target 目标对象
 * @param type 类型
 * @param key key
 * @param newValue 新值
 * @param oldValue 旧值
 * @param oldTarget 旧的目标对象
 */
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
  const depsMap = targetMap.get(target)
  // 依赖管理中没有, 代表没有收集过依赖，直接返回
  if (!depsMap) {
    // never been tracked
    //从未被追踪
    return
  }

  // 对依赖进行分类
  // effects 代表普通依赖，
  // 都是 Set 结构，避免重复收集
  const effects = new Set<ReactiveEffect>()
  const add = (effectsToAdd: Set<ReactiveEffect> | undefined) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => {
        // 避免重复收集
        if (effect !== activeEffect || effect.allowRecurse) {
          // 普通属性依赖
          effects.add(effect)
        }
      })
    }
  }

  if (type === TriggerOpTypes.CLEAR) {
    // collection being cleared
    // trigger all effects for target
    //清除集合
    //触发目标的所有效果
    depsMap.forEach(add)
  } else if (key === 'length' && isArray(target)) {
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= (newValue as number)) {
        add(dep)
      }
    })
  } else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      add(depsMap.get(key))
    }

    // also run for iteration key on ADD | DELETE | Map.SET
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!isArray(target)) {
          add(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            add(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        } else if (isIntegerKey(key)) {
          // new index added to array -> length changes
          add(depsMap.get('length'))
        }
        break
      case TriggerOpTypes.DELETE:
        if (!isArray(target)) {
          add(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            add(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        }
        break
      case TriggerOpTypes.SET:
        if (isMap(target)) {
          add(depsMap.get(ITERATE_KEY))
        }
        break
    }
  }

  const run = (effect: ReactiveEffect) => {
    if (__DEV__ && effect.options.onTrigger) {
      effect.options.onTrigger({
        effect,
        target,
        key,
        type,
        newValue,
        oldValue,
        oldTarget
      })
    }
    // 如果 scheduler 存在则调用 scheduler，计算属性拥有 scheduler
    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  }

  effects.forEach(run)
}
