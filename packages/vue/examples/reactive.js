// 利用 proxy
function reactive(obj) {
  // 对传入的obj进行响应式处理
  return new Proxy(obj, {
    get(target, key) {
      // 读操作的拦截
      const res = Reflect.get(target, key)
      console.log('获取', key)
      return res
    },
    set(target, key, value) {
      // 写操作的拦截
      const res = Reflect.set(target, key, value)
      console.log('设置', key)
      return res
    },
    deleteProperty(target, key) {
      // 删除属性的拦截
      const res = Reflect.deleteProperty(target, key)
      console.log('删除', key)
      return res
    }
  })
}

const obj = reactive({ foo: 'foo' })
// get
obj.foo
// set
obj.foo = 'xxxx'
// 动态设置、删除属性
obj.bar = 'bar'
delete obj.bar
