function walk(obj: any, funcs: ((x: any) => any)[]) {
  for (const key in Object.entries(obj)) {
    let val = obj[key]
    for (const f of funcs) val = f(val)
    if (typeof val == 'object') walk(val, funcs)
  }
}
