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
