`packages/runtime-core/src/apiWatch.ts`

`packages/runtime-core/src/scheduler.ts`

## 侦听器 watch

> 当侦听的对象或者函数发生了变化则自动执行某个回调函数

### 例子

1. 侦听一个 getter 函数

   ```js
   import { reactive, watch } from 'vue'
   const state = reactive({ count: 0 })
   watch(
     () => state.count,
     (count, prevCount) => {
       // 当 state.count 更新，会触发此回调函数
     }
   )
   ```

2. 侦听一个响应式对象

   ```js
   import { ref, watch } from 'vue'
   const count = ref(0)
   watch(count, (count, prevCount) => {
     // 当 count.value 更新，会触发此回调函数
   })
   ```

3. 侦听多个响应式对象

   ```js
   import { ref, watch } from 'vue'
   const count = ref(0)
   const count2 = ref(1)
   watch([count, count2], ([count, count2], [prevCount, prevCount2]) => {
     // 当 count.value 或者 count2.value 更新，会触发此回调函数
   })
   ```

### 原理

调用前会在非生产环境下判断第二个参数 `cb` 是不是一个函数，如果不是则会报警告以告诉用户应该使用 `watchEffect(fn, options) API`，

```js
function watch(source, cb, options) {
  if (process.env.NODE_ENV !== 'production' && !isFunction(cb)) {
    warn(
      `\`watch(fn, options?)\` signature has been moved to a separate API. ` +
        `Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` +
        `supports \`watch(source, cb, options?) signature.`
    )
  }
  return doWatch(source, cb, options)
}
function doWatch(
  source,
  cb,
  { immediate, deep, flush, onTrack, onTrigger } = EMPTY_OBJ
) {
  // 标准化 source
  // 构造 applyCb 回调函数
  // 创建 scheduler 时序执行函数
  // 创建 effect 副作用函数
  // 返回侦听器销毁函数
}
```

1. `source` 可以是 `getter` 函数，也可以是响应式对象甚至是响应式对象数组，所以我们需要标准化 `source`

   1. 如果 source 是 ref 对象，则创建一个访问 source.value 的 getter 函数;

   2. 如果 source 是 reactive 对象，则创建一个访问 source 的 getter 函数，并设置 deep 为 true（deep 的作用我稍后会说）;

   3. 如果 source 是一个函数，则会进一步判断第二个参数 cb 是否存在，对于 watch API 来说，cb 是一定存在且是一个回调函数，这种情况下，getter 就是一个简单的对 source 函数封装的函数。

2. deep 属于 watcher 的一个配置选项，Vue.js 2.x 也支持，表面含义是深度侦听，实际上是通过遍历对象的每一个子属性来实现
3. cb 是一个回调函数，它有三个参数：第一个 newValue 代表新值；第二个 oldValue 代表旧值。第三个参数 onInvalidate
4. scheduler 的作用是根据某种调度的方式去执行某种函数，在 watch API 中，主要影响到的是回调函数的执行方式

## watchEffect API

> watchEffect API 的作用是注册一个副作用函数，副作用函数内部可以访问到响应式对象，当内部响应式对象变化后再立即执行这个函数。

watchEffect 和前面的 watch API 有哪些不同呢？主要有三点：

1. **侦听的源不同** 。watch API 可以侦听一个或多个响应式对象，也可以侦听一个 getter 函数，而 watchEffect API 侦听的是一个普通函数，只要内部访问了响应式对象即可，这个函数并不需要返回响应式对象。
2. **没有回调函数** 。watchEffect API 没有回调函数，副作用函数的内部响应式对象发生变化后，会再次执行这个副作用函数。
3. **立即执行** 。watchEffect API 在创建好 watcher 后，会立刻执行它的副作用函数，而 watch API 需要配置 immediate 为 true，才会立即执行回调函数。\*\*\*\*
