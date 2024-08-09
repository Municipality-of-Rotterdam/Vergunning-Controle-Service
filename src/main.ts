import fs, { mkdir } from 'fs/promises'
import * as path from 'path'
import { rimraf } from 'rimraf'

import { write } from '@jeswr/pretty-turtle'

import { prefixes } from './helpers/namespaces.js'
import { finishProvenance, setPhase } from './provenance/provenance.js'
import { Context, Step } from './types.js'

const steps = (
  (await Promise.all(
    (await fs.readdir('./src/steps')).map((stepFile) =>
      import(`./steps/${stepFile}`).then((stepModule) => stepModule.default),
    ),
  )) as Step[]
).sort((a, b) => b.weight - a.weight)

const context: Context = {
  ifcFile: path.join('input', 'ifc', 'Kievitsweg_R23_MVP_IFC4.ifc'),
  idsFile: path.join('input', 'IDS Rotterdam BIM.ids'),
  outputsDir: path.join('outputs', 'KievitswegRMVPIFC'),
}

await rimraf(context.outputsDir!)
await mkdir(context.outputsDir!)

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
