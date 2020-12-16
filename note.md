1. createApp()
2. ensureRenderer()
3. createRenderer() `packages\runtime-core\src\renderer.ts`
4. baseCreateRenderer()
   ```ts
   // 这就是渲染器
   return {
     render,
     hydrate,
     createApp: createAppAPI(render, hydrate)
   }
   ```
   1. render
   2. createApp
5. createAppAPI
   1. const app: App = (context.app = {})
      ```ts
      const app: App = (context.app = {
        use(plugin: Plugin, ...options: any[]) {},
        mixin(mixin: ComponentOptions) {},
        component(name: string, component?: Component): any {},
        directive(name: string, directive?: Directive) {},
        mount(rootContainer: HostElement, isHydrate?: boolean): any {},
        unmount() {},
        provide(key, value) {}
      })
      ```

**初始化传入的是组件 Component（是对象，当做组件）**
