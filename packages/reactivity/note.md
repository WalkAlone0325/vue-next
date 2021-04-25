## 1. 目录结构

```tree
.
├── LICENSE
├── README.md
├── __tests__  // 单元测试目录
│   ├── collections
│   │   ├── Map.spec.ts
│   │   ├── Set.spec.ts
│   │   ├── WeakMap.spec.ts
│   │   └── WeakSet.spec.ts
│   ├── computed.spec.ts
│   ├── effect.spec.ts
│   ├── reactive.spec.ts
│   ├── reactiveArray.spec.ts
│   ├── readonly.spec.ts
│   └── ref.spec.ts
├── api-extractor.json
├── index.js
├── package.json
└── src
    ├── baseHandlers.ts // 基本类型的处理器
    ├── collectionHandlers.ts  // Set Map WeakSet WeckMap的处理器
    ├── computed.ts // 计算属性，同Vue2
    ├── effect.ts // reactive 核心，处理依赖收集，依赖更新
    ├── index.ts
    ├── operations.ts // 定义依赖收集，依赖更新的类型
    ├── reactive.ts // reactive 入口，内部主要以Proxy实现
    └── ref.ts // reactive 的变种方法，Proxy处理不了值类型的响应，Ref来处理
```

![流程](https://static.vue-js.com/c2344a60-cd86-11ea-ae44-f5d67be454e7.png)

## 2. 阅读顺序

```tree
/reactivity/reactive
/reactivity/baseHandlers
/reactivity/effect
/reactivity/ref
/reactivity/computed
```

## reactive

> 定义: 接收一个普通对象然后返回该普通对象的响应式代理。等同于 2.x 的 Vue.observable()

1. `reactive` 函数定义
   ```ts
   export function reactive(target: object) {
     // 如果目标对象是一个只读的响应数据,则直接返回目标对象
     if (target && (target as Target)[ReactiveFlags.IS_READONLY]) {
       return target
     }
     // 否则调用  createReactiveObject 创建 observe
     return createReactiveObject(
       target,
       false,
       mutableHandlers,
       mutableCollectionHandlers
     )
   }
   ```
2. `createReactiveObject` 创建 `reactive` 对象：

   1. 判断 `target` 是不是数组或者对象类型，如果不是则直接返回（原始数据 `target` 必须是 **对象** 或者 **数组**）
   2. 如果对一个已经是响应式的对象再执行 `reactive` ，应该返回这个响应式对象
   3. `reactive` 函数通过 `target.__v_raw` 属性来判断 `target` 是否已经**是**一个响应式对象，如果是直接返回响应式对象
   4. `reactive` 函数通过 `target.__v_reactive` 属性来判断 `target` 是否已经**有**一个响应式对象，如果是直接返回响应式对象
   5. `canObserve` 函数对 `target` 对象限制：被冻结的对象 和 不在白名单内的对象（如 date）不能变成响应式
   6. `createReactiveObject` 函数通过 `Proxy API` 劫持 `target` 对象，把它变成响应式
   7. 给原始数据打标识，`target.__v_reactive = observed`
   8. `mutableHandlers` (`packages\reactivity\src\baseHandlers.ts`)

      ```ts
      export const mutableHandlers: ProxyHandler<object> = {
        get,
        set,
        deleteProperty,
        has,
        ownKeys
      }
      ```

3. 依赖收集：`get` 函数：

   1. 通过 `Reflect.get` 方法求值，然后执行 `track` 函数收集依赖
   2. 函数最后会对计算的值 `res` 进行判断，如果也是数组或对象，则递归执行 `reactive` 把 `res` 变成响应式对象（因为 `proxy` 劫持的是对象本身，并不能劫持子对象变化）
   3. `track` 函数的实现（track.js）

4. 派发通知：`set` 函数：

   1. 派发通知在数据更新阶段，用 `Proxy API` 劫持了数据对象，当这个响应式对象属性更新的时候就会执行 `set` 函数
   2. `set` 函数是 `createSetter` 函数执行的返回值

      1. 首先通过 `Reflect.set` 求值
      2. 然后通过 `trigger` 函数派发通知，并依据 `key` 是否存在在 `target` 上来确定通知类型

   3. 核心：执行 `trigger` 函数派发通知
      1. `trigger` 函数就是根据 `target` 和 `key` 从 `targetMap` 中找到相关的所有**副作用函数**遍历执行一遍

5. 副作用函数：`effect` 函数：

## ref

> 接受一个参数值并返回一个响应式且可改变的 ref 对象。ref 对象拥有一个指向内部值的单一属性 .value。

正文
ref 跟 reactive 都是响应系统的核心方法，作为整个系统的入口

可以将 ref 看成 reactive 的一个变形版本，这是由于 reactive 内部采用 Proxy 来实现，而 Proxy 只接受对象作为入参，这才有了 ref 来解决值类型的数据响应，如果传入 ref 的是一个对象，内部也会调用 reactive 方法进行深层响应转换

## baseHandlers.ts // 基本类型的处理器

- mutableHandlers 可变处理
- readonlyHandlers 只读处理
- shallowReactiveHandlers 浅观察处理（只观察目标对象的第一层属性）
- shallowReadonlyHandlers 浅观察 && 只读处理

## effect

> effect 作为 reactive 的核心，主要负责收集依赖，更新依赖

参数：

- fn 回调函数
- options 参数

* track 收集依赖(get 操作)
* trigger 触发依赖(触发更新后执行监听函数之前触发)

## computed

> 传入一个 getter 函数，返回一个默认不可手动修改的 ref 对象
> 或者传入一个拥有 get 和 set 函数的对象，创建一个可手动修改的计算状态。

计算属性，可能会依赖其他 reactive 的值，同时会延迟和缓存计算值

```js
const count = ref(1)
const plusOne = computed({
  get: () => count.value + 1,
  set: val => {
    count.value = val - 1
  }
})

plusOne.value = 1
console.log(count.value) // 0
```

1. shallow（浅观察）

只响应一层对象，第二层开始不会响应式变化

2. raw

```js
const state = reactive({
  name: 'loner'
})
```

- state 为 proxy 对象
- {name: 'loner'} 为 raw 对象

3. computed（`_dirty`）

设置`_dirty`属性，只有在获取的时候才会更新
