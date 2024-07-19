import { GrapoiPointer } from '@helpers/grapoi.js'
import { headerLog } from '@helpers/headerLog.js'
import { Quad_Subject } from '@rdfjs/types'
import { Store as TriplyStore } from '@triplydb/data-factory'

import { Verrijkingen } from './verrijkingen.js'

export type StepContext = {
  // Init
  account: string
  args: Record<string, string>
  assetBaseUrl: string
  ifcAssetBaseUrl: string
  baseIRI: string
  consoleUrl: string
  datasetName: string
  idsIdentifier: string
  ifcIdentifier: string
  inputIds: string
  inputIfc: string
  outputsDir: string
  ruleIds: number[]
  //provenanceDataset: TriplyStore

  // ids
  idsControle: GrapoiPointer

  // maakLinkedData
  gebouwDataset: TriplyStore
  gebouwSubject: Quad_Subject
  gebouwAddress: string

  // verrijk
  verrijkingenDataset: TriplyStore
  // Zie type Verrijkingen

  // Valideer
  validation: TriplyStore
  validationPointer: GrapoiPointer
} & Verrijkingen
