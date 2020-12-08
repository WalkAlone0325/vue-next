## lifecycle 生命周期函数

### 例子

```md
beforeCreate -> 使用 setup()
created -> 使用 use setup()
beforeMount -> onBeforeMount
mounted -> onMounted
beforeUpdate -> onBeforeUpdate
updated -> onUpdated
beforeDestroy-> onBeforeUnmount
destroyed -> onUnmounted
activated -> onActivated
deactivated -> onDeactivated
errorCaptured -> onErrorCaptured
```

`Vue.js 3.0` 还新增了两个用于调试的生命周期 API：`onRenderTracked` 和 `onRenderTriggered`。

### 原理

```ts
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)

export type DebuggerHook = (e: DebuggerEvent) => void
export const onRenderTriggered = createHook<DebuggerHook>(
  LifecycleHooks.RENDER_TRIGGERED
)
export const onRenderTracked = createHook<DebuggerHook>(
  LifecycleHooks.RENDER_TRACKED
)

export type ErrorCapturedHook = (
  err: unknown,
  instance: ComponentPublicInstance | null,
  info: string
) => boolean | void

export const onErrorCaptured = (
  hook: ErrorCapturedHook,
  target: ComponentInternalInstance | null = currentInstance
) => {
  injectHook(LifecycleHooks.ERROR_CAPTURED, hook, target)
}
```

除了 `onErrorCaptured`，其他钩子函数都是通过 `createHook` 函数创建的，通过传入不同的字符串来表示不同的钩子函数。

```js
const createHook = function(lifecycle) {
  return function(hook, target = currentInstance) {
    injectHook(lifecycle, hook, target)
  }
}
```

1. `createHook` 会返回一个函数，它的内部通过 `injectHook` 注册钩子函数
2. 这里为什么要用 `createHook` 做一层封装而不直接使用 `injectHook API` 呢？

   这些钩子函数内部执行逻辑很类似，都是执行 injectHook，唯一的区别是第一个参数字符串不同，所以这样的代码是可以进一步封装的，用 `createHook` 封装，这就是一个典型的函数柯里化技巧

```js
function injectHook(type, hook, target = currentInstance, prepend = false) {
  const hooks = target[type] || (target[type] = [])
  // 封装 hook 钩子函数并缓存
  const wrappedHook =
    hook.__weh ||
    (hook.__weh = (...args) => {
      if (target.isUnmounted) {
        return
      }
      // 停止依赖收集
      pauseTracking()
      // 设置 target 为当前运行的组件实例
      setCurrentInstance(target)
      // 执行钩子函数
      const res = callWithAsyncErrorHandling(hook, target, type, args)
      setCurrentInstance(null)
      // 恢复依赖收集
      resetTracking()
      return res
    })
  if (prepend) {
    hooks.unshift(wrappedHook)
  } else {
    hooks.push(wrappedHook)
  }
}
```
