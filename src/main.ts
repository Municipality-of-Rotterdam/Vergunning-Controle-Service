import fs from 'fs/promises'

import { write } from '@jeswr/pretty-turtle'

import { establishContext } from './helpers/establishContext.js'
import { prefixes } from './helpers/namespaces.js'
import { finishProvenance, setPhase } from './provenance/provenance.js'
import { Step } from './types.js'

const steps = (
  (await Promise.all(
    (await fs.readdir('./src/steps')).map((stepFile) =>
      import(`./steps/${stepFile}`).then((stepModule) => stepModule.default),
    ),
  )) as Step[]
).sort((a, b) => b.weight - a.weight)

const context = await establishContext()

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
