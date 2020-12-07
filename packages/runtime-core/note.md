## 组件渲染前的初始化过程

> 创建 VNode ——> 渲染 VNode ——> DOM

1. 挂载组件(`packages\runtime-core\src\renderer.ts`)

   ```js
   // 挂载组件
   const mountComponent = () => {
     // 创建组件实例
     const instance = (initialVNode.component = createComponentInstace())
     // 设置组件实例
     setupComponent(instance)
     // 设置并运行带副作用的渲染函数
     setupRenderEffect()
   }
   ```

   1. 创建组件实例`createComponentInstace()`(`packages\runtime-core\src\component.ts`)

      ```js
      // 创建组件实例
      export function createComponentInstance(
        vnode: VNode,
        parent: ComponentInternalInstance | null,
        suspense: SuspenseBoundary | null
      ) {
        const type = vnode.type as ConcreteComponent
        // inherit parent app context - or - if root, adopt from root vnode
        //继承父应用上下文-或-如果是root，则从root vnode接受
        const appContext =
          (parent ? parent.appContext : vnode.appContext) || emptyAppContext

        const instance: ComponentInternalInstance = {
          uid: uid++, // 组件唯一id
          vnode, // 组件VNode
          type, // 类型
          parent, // 父组件实例
          appContext, // app 上下文
          root: null!, // 根组件实例 // to be immediately set
          next: null, // 新的组件 VNode
          subTree: null!, // 子节点VNode // will be set synchronously right after creation
          update: null!, // 带副作用更新函数 // will be set synchronously right after creation
          render: null, // 渲染函数
          proxy: null, // 渲染上下文代理
          exposed: null,
          withProxy: null, // 带有with区块的渲染上下文代理
          effects: null, // 响应式相关对象
          provides: parent ? parent.provides : Object.create(appContext.provides), // 依赖注入相关
          accessCache: null!, // 渲染代理的属性访问缓存
          renderCache: [], // 渲染缓存

          // local resovled assets
          components: null, // 注册的组件
          directives: null, // 注册的指令

          // resolved props and emits options
          propsOptions: normalizePropsOptions(type, appContext),
          emitsOptions: normalizeEmitsOptions(type, appContext),

          // emit
          emit: null as any, // 派发事件方法 // to be set immediately
          emitted: null,

          // state
          ctx: EMPTY_OBJ, // 渲染上下文
          data: EMPTY_OBJ, // data 数据
          props: EMPTY_OBJ, // props 数据
          attrs: EMPTY_OBJ, // 普通属性
          slots: EMPTY_OBJ, // 插槽相关
          refs: EMPTY_OBJ, // 组件或者DOM的ref引用
          setupState: EMPTY_OBJ, // setup 函数返回的响应式结果
          setupContext: null, // setup 函数上下文数据

          // suspense related
          suspense, // suspense 相关
          suspenseId: suspense ? suspense.pendingId : 0,
          asyncDep: null, // suspense异步依赖
          asyncResolved: false, // suspense异步依赖是否已经处理

          // lifecycle hooks
          // not using enums here because it results in computed properties
          isMounted: false, // 是否挂载
          isUnmounted: false, // 是否卸载
          isDeactivated: false, // 是否激活
          bc: null, // 生命周期 beforeCreate
          c: null, // 生命周期 created
          bm: null, // beforeMount
          m: null, // mounted
          bu: null, // beforeUpdate
          u: null, // updated
          um: null, // unmounted
          bum: null, // beforeUnmount
          da: null, // deactivated
          a: null, // activated
          rtg: null, // render triggered
          rtc: null, // render tracked
          ec: null // error captured
        }
        if (__DEV__) {
          instance.ctx = createRenderContext(instance)
        } else {
          instance.ctx = { _: instance }
        }
        // 初始化根组件指针
        instance.root = parent ? parent.root : instance
        // 初始化派发事件方法
        instance.emit = emit.bind(null, instance)
        return instance
      }
      ```

   2. 设置组件实例 `setupComponent`(`packages\runtime-core\src\component.ts`)

      ```js
      // 设置组件实例
      export function setupComponent() {
        // 判断是否是一个有状态的组件
        const isStateful = shapeFlag & ShapeFlags.STATEFUL_COMPONENT
        // 初始化 props
        initProps(instance, props, isStateful, isSSR)
        // 初始化插槽
        initSlots(instance, children)
        // 设置有状态的组件实例
        const setupResult = isStateful
          ? setupStatefulComponent(instance, isSSR)
          : undefined
      }
      // 有状态的组件实例
      function setupStatefulComponent() {
        //0. 创建渲染代理属性访问缓存
        instance.accessCache = Object.create(null)
        // 1. 创建渲染上下文代理
        instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)
        // 2. 判断处理 setup 函数
        const { setup } = Component
        if (setup) {
          // 如果setup函数带参数，则创建一个setupContext
          const setupContext = (instance.setupContext =
            setup.length > 1 ? createSetupContext(instance) : null)
          // 执行 setup 函数，获取结果
          const setupResult = callWithErrorHandling(
            setup,
            instance,
            ErrorCodes.SETUP_FUNCTION
          )
          // 处理 setup 执行结果
          handleSetupResult(instance, setupResult, isSSR)
        } else {
          // 完成组件实例设置
          finishComponentSetup(instance, isSSR)
        }
      }
      ```

   3. 创建渲染上下文代理：(`packages\runtime-core\src\componentPublicInstance.ts`)

      `PublicInstanceProxyHandlers` 是 `instance.ctx` 的代理处理：

      - Vue3 中为了方便维护，把组件中的不用状态的数据存储到不同的属性中，比如存储到 `setupState`,`ctx`,`data`,`props`中
      - 在执行组件渲染函数的时候，直接访问渲染上下文 `instance.ctx` 中的属性，做一层 `proxy` 代理到对 `setupState`,`ctx`,`data`,`props` 中的数据的访问和修改

      ```js
      // ctx 代理的处理函数，创建渲染上下文代理
      export const PublicInstanceProxyHandlers(){
        get() {
          let normalizedProps
          if (key[0] !== '$') {
          // setupState / data / props / ctx
          // 渲染代理的属性访问缓存中
          const n = accessCache![key]
          if (n !== undefined) {
            // 从缓存中取
            switch (n) {
              case AccessTypes.SETUP:
                return setupState[key]
              case AccessTypes.DATA:
                return data[key]
              case AccessTypes.CONTEXT:
                return ctx[key]
              case AccessTypes.PROPS:
                return props![key]
              // default: just fallthrough
            }
            // 从 setupState 中取数据
            return setupState[key]
            // 从 data 中取数据
            return data[key]
            // 从 props 中取数据
            return props![key]
            // 从 ctx 中取数据
            return ctx[key]
            // 都取不到
          }
        }
      }
      ```

      1. 第一次取到 key 对应的数据时，利用 `accessCache[key]` 去缓存数据
      2. 下一次再次根据 key 查找数据，直接通过缓存，不需要在一次调用 hasOwn 去判断

   4. 用 `createSetupContext` 创建 `setupContext`(`packages\runtime-core\src\component.ts`)：

      ```js
      export function createSetupContext() {
        return {
          attrs: instance.attrs,
          slots: instance.slots,
          emit: instance.emit,
          expose
        }
      }
      ```

   5. 执行 setup 函数，获取结果 `callWithErrorHandling`： (`packages\runtime-core\src\errorHandling.ts`)
   6. 处理 setup 执行结果，`handleSetupResult`(`packages\runtime-core\src\component.ts`)：
   7. 完成组件实例设置 `finishComponentSetup`：
   8. 想
   9. x

2. 是 s
3. 是
4. 是
