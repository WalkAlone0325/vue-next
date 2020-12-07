import { effect, ReactiveEffect, trigger, track } from './effect'
import { TriggerOpTypes, TrackOpTypes } from './operations'
import { Ref } from './ref'
import { isFunction, NOOP } from '@vue/shared'
import { ReactiveFlags, toRaw } from './reactive'

export interface ComputedRef<T = any> extends WritableComputedRef<T> {
  readonly value: T
}

export interface WritableComputedRef<T> extends Ref<T> {
  readonly effect: ReactiveEffect<T>
}

export type ComputedGetter<T> = (ctx?: any) => T
export type ComputedSetter<T> = (v: T) => void

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

// ComputedRefImpl Class
// 创建 effect, 我们在看 effect 源码时知道了传入 lazy 代表不会立即执行，
// computed 表明 computed 上游依赖改变的时候，会优先 trigger runner effect,
// scheduler 表示 effect trigger 的时候会调用 scheduler 而不是直接调用 effect
class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true

  public readonly effect: ReactiveEffect<T>

  public readonly __v_isRef = true;
  public readonly [ReactiveFlags.IS_READONLY]: boolean

  constructor(
    getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>,
    isReadonly: boolean
  ) {
    this.effect = effect(getter, {
      lazy: true,
      scheduler: () => {
        // 在触发更新时把dirty置为true, 不会立即更新
        if (!this._dirty) {
          this._dirty = true
          // 触发依赖
          trigger(toRaw(this), TriggerOpTypes.SET, 'value')
        }
      }
    })

    this[ReactiveFlags.IS_READONLY] = isReadonly
  }

  // getter 函数，获取值
  get value() {
    // dirty 为 ture, get 操作时，执行 effect 获取最新值
    if (this._dirty) {
      this._value = this.effect()
      this._dirty = false
    }
    // dirty 为 false, 表示值未更新，直接返回，不用触发更新
    track(toRaw(this), TrackOpTypes.GET, 'value')
    // 返回
    return this._value
  }

  // setter 函数，设置值
  set value(newValue: T) {
    this._setter(newValue)
  }
}

// computed 计算属性
export function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>
export function computed<T>(
  options: WritableComputedOptions<T>
): WritableComputedRef<T>
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>

  // 如果传入是 function 说明是只读 computed
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions
    setter = __DEV__
      ? () => {
          console.warn('Write operation failed: computed value is readonly')
        }
      : NOOP
  } else {
    // 不是方法说明是自定义的 getter setter
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  // ComputedRefImpl Class
  return new ComputedRefImpl(
    getter,
    setter,
    isFunction(getterOrOptions) || !getterOrOptions.set
  ) as any
}
