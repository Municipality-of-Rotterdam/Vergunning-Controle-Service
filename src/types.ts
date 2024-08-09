export type Step = {
  name: string
  description: string
  run(context: Context): Promise<any>
}

export type Context = {
  ifcFile: string
  idsFile: string
  inputsDir: string
  outputsDir: string
}
