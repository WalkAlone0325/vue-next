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

   2. 设置组件实例 `setupComponent`(``)

2. 是
