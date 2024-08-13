import 'dotenv/config'

import { write } from '@jeswr/pretty-turtle'
import { prov, rdf } from '@root/helpers/namespaces.js'

import { establishContext } from './helpers/establishContext.js'
import { prefixes } from './helpers/namespaces.js'
import { SKIP_STEP, skipStep } from './helpers/skipStep.js'
import { finishProvenance, initProvenance, provenancePointer, setPhase } from './provenance/provenance.js'
import createDataStory from './steps/createDataStory.js'
import executeIds from './steps/executeIds.js'
import gltf from './steps/gltf.js'
import footprint from './steps/footprint.js'
import linkedBuildingData from './steps/linkedBuildingData.js'
import { Step } from './types.js'

/**
 * Phase: Preprocessing data
 * - IDS check, building to linked data and adding enrichments.
 * - Each *Step* must write data to TriplyDB, after this step the graphs: gebouw, provenance, externe-data & verrijking are filled
 */
const context = await establishContext()
initProvenance(context)

const steps: Step[] = [executeIds, linkedBuildingData, gltf, footprint, createDataStory]
for (const step of steps) {
  try {
    setPhase(step.name)
    const result = await step.run(context)
    // If you return SKIP_STEP from a step it will be correctly put into provenance.
    if (result === SKIP_STEP) skipStep(step.name)
  } catch (error) {
    provenancePointer.addOut(rdf('type'), prov('ErroredActivity'))
    if (error instanceof Error) provenancePointer.addOut(prov('error'), error.message)
    break // When a fatal happens we can not finish the VCS.
  }
}

console.log(
  await write([...(await finishProvenance())], {
    prefixes,
  }),
)
