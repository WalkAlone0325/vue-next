## 核心库

```sh
lerna init
lerna list
```

> 输出：

lerna notice cli v3.22.1

1. @vue/compiler-core // 核心编译
2. @vue/compiler-dom // dom 编译
3. @vue/compiler-sfc // .vue 单文件编辑
4. @vue/compiler-ssr // 服务端渲染编译
5. @vue/reactivity // 响应式核心
6. @vue/runtime-core // 运行时核心
7. @vue/runtime-dom // 运行时 DOM
8. @vue/server-renderer // 自定义渲染
9. @vue/shared // 公用工具方法
10. vue // vue 入口

lerna success found 10 packages

## runtime 相关

1. 位运算的好处：

   1. 很容易进行复合，我们可以通过 TEXT | CLASS 来得到 0000000011，而这个值可以表示他即有 TEXT 的特性，也有 CLASS 的特性
   2. 方便进行对比，我们拿到一个值 FLAG 的时候，想要判断他有没有 TEXT 特性，只需要 FLAG & TEXT > 0 就行
   3. 方便扩展，在足够位数的情况下，我们新增一种特性就只需要让他左移的位数加一就不会重复

      这种方式其实很常见，比如我们做一个系统的权限管理的时候也会考虑这么做，在 REACT 里面这种方式也有很多应用。
