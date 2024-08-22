import Dataset from '@triply/triplydb/Dataset.js';

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
  cache: boolean
  baseIRI: string
  buildingDataset: Dataset
  datasetName: string
  sourceIfcFileName: string
  sourceIdsFileName: string
}
