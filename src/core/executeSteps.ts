import { BaseGroep } from '@core/BaseGroep.js'
import { GrapoiPointer } from '@helpers/grapoi.js'
import { headerLog } from '@helpers/headerLog.js'
import { Quad_Subject } from '@rdfjs/types'
import { Store as TriplyStore } from '@triplydb/data-factory'

import { Verrijkingen } from './verrijkingen.js'

export type StepContext = {
  // Init
  ruleIds: number[]
  outputsDir: string
  inputIfc: string
  ifcIdentifier: string
  inputIds: string
  idsIdentifier: string
  args: Record<string, string>
  datasetName: string
  account: string
  baseIRI: string

  // maakLinkedData
  gebouwDataset: TriplyStore
  gebouwSubject: Quad_Subject

  // verrijk
  verrijkingenDataset: TriplyStore
  // Zie type Verrijkingen

  // controles
  checkGroups: BaseGroep<{}>[]

  // Valideer
  report: TriplyStore
  pointer: GrapoiPointer
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
