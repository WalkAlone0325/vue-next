// using literal strings instead of numbers so that it's easier to inspect
// debugger events
//使用文字字符串而不是数字，以便于检查
//调试器事件

//  get、 has、 iterate 三种类型的读取对象会触发 track
export const enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate'
}

//  set add delete clear 三种类型的读取对象会触发 trigger
export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear'
}
