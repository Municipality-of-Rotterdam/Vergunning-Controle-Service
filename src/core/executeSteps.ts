import { GrapoiPointer } from '@helpers/grapoi.js'
import { headerLog } from '@helpers/headerLog.js'
import { Quad_Subject } from '@rdfjs/types'
import { Store as TriplyStore } from '@triplydb/data-factory'
import { Controle } from './Controle.js'

import { Verrijkingen } from './verrijkingen.js'
import { NamespaceBuilder } from '@rdfjs/namespace'

export type StepContext = {
  // Init
  account: string
  args: Record<string, string>
  assetBaseUrl: string
  baseIRI: string
  consoleUrl: string
  datasetName: string
  idsIdentifier: string
  idsName: string
  ifcAssetBaseUrl: string
  ifcIdentifier: string
  inputIds: string
  inputIfc: string
  outputsDir: string
  rpt: NamespaceBuilder
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
  controle: Controle<any, any>
} & Verrijkingen
