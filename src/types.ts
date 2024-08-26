import Dataset from '@triply/triplydb/Dataset.js'

export type Step = {
  name: string
  description: string
  strict: boolean
  run(context: Context): Promise<any>
}

export type Context = {
  vocabName: string
  ifcFile: string
  idsFile: string
  inputsDir: string
  outputsDir: string
  cache: boolean
  baseIRI: string
  buildingDataset: Dataset
  datasetName: string
  sourceIfcFileName: string
  sourceIdsFileName: string
}
