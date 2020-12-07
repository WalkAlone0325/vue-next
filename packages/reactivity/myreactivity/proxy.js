const target = {
  foo: 'bar'
}
const handler = {
  // get() {
  //   // arguments: trapTarget, property, receiver
  //   return Reflect.get(...arguments)
  // }
  get: Reflect.get
}

const proxy = new Proxy(target, handler)

console.log(proxy.foo)
console.log(target.foo)
