import { BaseGroep } from '@core/BaseGroep.js'
import { GrapoiPointer } from '@helpers/grapoi.js'
import { headerLog } from '@helpers/headerLog.js'
import { Quad_Subject } from '@rdfjs/types'
import { Store as TriplyStore } from '@triplydb/data-factory'
import Provenance from './Provenance.js'

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

  // ids
  idsControle: GrapoiPointer

  // maakLinkedData
  gebouwDataset: TriplyStore
  gebouwSubject: Quad_Subject

  // verrijk
  verrijkingenDataset: TriplyStore
  // Zie type Verrijkingen

  // controles
  checkGroups: BaseGroep<{}>[]
  provenance: Provenance

  // Valideer
  validation: TriplyStore
  validationPointer: GrapoiPointer
} & Verrijkingen

type Step = [string, (context: StepContext) => Promise<Partial<StepContext> | void>]

export const executeSteps = async (steps: Step[]) => {
  console.clear()

  const context: Partial<StepContext> = {}

  for (const [label, stepFunction] of steps) {
    headerLog(label)
    /** @ts-ignore I could not get this right and I also do not think it matters */
    const additionalContext = await stepFunction(context)

    if (additionalContext) {
      Object.assign(context, additionalContext)
    }
  }

  console.log('\n')
}
