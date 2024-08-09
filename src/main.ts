import { write } from '@jeswr/pretty-turtle'

import { establishContext } from './helpers/establishContext.js'
import { prefixes } from './helpers/namespaces.js'
import { finishProvenance, setPhase } from './provenance/provenance.js'
import executeIds from './steps/executeIds.js'
import { Step } from './types.js'

const context = await establishContext()

const steps: Step[] = [executeIds]
for (const step of steps) {
  try {
    setPhase(step.name)
    await step.run(context)
  } catch {
    break // When a fatal happens we can not finish the VCS.
  }
}

console.log(
  await write([...(await finishProvenance())], {
    prefixes,
  }),
)
