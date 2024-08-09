export type Step = {
  name: string
  description: string
  weight: number
  run(context: Context): Promise<any>
}

export type Context = Partial<{
  ifcFile: string
  idsFile: string
  outputsDir: string
}>
