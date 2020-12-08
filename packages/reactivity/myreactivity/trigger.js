// 原始数据对象 map
const taargetMap = new WeakMap()
function trigger(target, type, key, newValue) {
  // 通过 targetMap 拿到 target 对应的依赖集合
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // 没有依赖，直接返回
    return
  }
  // 创建运行的 effects 集合
  const effects = new Set()
  // 添加 effects 函数
  if (effectsToAdd) {
    effectsToAdd.forEach(effect => {
      effects.add(effect)
    })
  }
}
// SET | ADD | DELETE 操作之一，添加对应的 effects
if (key !== void 0) {
  add(depsMap.get(key))
}
const run = effect => {
  // 调度执行
  if (effect.options.scheduler) {
    effect.options.scheduler(effect)
  } else {
    // 直接执行
    effect()
  }
}
//遍历执行 effects
effects.forEach(run)
