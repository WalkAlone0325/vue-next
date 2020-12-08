# provide inject API

`packages/runtime-core/src/apiInject.ts`

## 例子

```js
// Provider
import { provide, ref } from 'vue'
export default {
  setup() {
    const theme = ref('dark')
    provide('theme', theme)
  }
}

// Consumer
import { inject } from 'vue'
export default {
  setup() {
    const theme = inject('theme', 'light') // 第二个参数是默认值
    return {
      theme
    }
  }
}
```

## provide API

```js
function provide(key, value) {
  let provides = currentInstance.provides
  const parentProvides =
    currentInstance.parent && currentInstance.parent.provides
  if (parentProvides === provides) {
    provides = currentInstance.provides = Object.create(parentProvides)
  }
  provides[key] = value
}
```

在创建组件实例的时候，组件实例的 provides 对象指向父组件实例的 provides 对象：

```js
const instance = {
  // 依赖注入相关
  provides: parent ? parent.provides : Object.create(appContext.provides)
  // 其它属性
  // ...
}
```

## inject API

```js
function inject(key, defaultValue) {
  const instance = currentInstance || currentRenderingInstance
  if (instance) {
    const provides = instance.provides
    if (key in provides) {
      return provides[key]
    } else if (arguments.length > 1) {
      return defaultValue
    } else if (process.env.NODE_ENV !== 'production') {
      warn(`injection "${String(key)}" not found.`)
    }
  }
}
```
