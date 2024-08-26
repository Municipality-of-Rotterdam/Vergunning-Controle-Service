import 'dotenv/config'

import fs from 'fs/promises'

import { write } from '@jeswr/pretty-turtle'
import { prefixes, prov, rdf } from '@root/core/namespaces.js'

import { establishContext } from './core/establishContext.js'
import { SKIP_STEP, skipStep } from './helpers/skipStep.js'
import { finishProvenance, initProvenance, provenancePointer, setPhase } from './provenance/provenance.js'
import createVocab from './steps/createVocab.js'
import createDataStory from './steps/createDataStory.js'
import executeIds from './steps/executeIds.js'
import footprint from './steps/footprint.js'
import gltf from './steps/gltf.js'
import linkedBuildingData from './steps/linkedBuildingData.js'
import ruimtelijkePlannen from './steps/ruimtelijkePlannen.js'
import welstand from './steps/Welstand.js'
import wind from './steps/Wind.js'
import { Step } from './types.js'

/**
 * Phase: Preprocessing data
 * - IDS check, building to linked data and adding enrichments.
 * - Each *Step* must write data to TriplyDB, after this step the graphs: gebouw, provenance, externe-data & verrijking are filled
 */
const context = await establishContext()
initProvenance(context)

const steps: Step[] = [
  executeIds,

  // Building data
  linkedBuildingData, // convert IFC model to linked data
  gltf, // extract 3d model from IFC model
  footprint, // calculate footprint geometries from IFC model

  // API calls
  ruimtelijkePlannen,
  wind,
  welstand,

  // Data story
  createVocab,
  createDataStory,
]

for (const step of steps) {
  try {
    console.info(step.name)
    setPhase(step.name)
    const result = await step.run(context)
    // If you return SKIP_STEP from a step it will be correctly put into provenance.
    if (result === SKIP_STEP) skipStep(step.name)
  } catch (error) {
    provenancePointer.addOut(rdf('type'), prov('ErroredActivity'))
    if (error instanceof Error) provenancePointer.addOut(prov('error'), error.message)
    console.error(error)
  }
}

const provenanceQuads = await finishProvenance()
const provenanceTurtle = await write(provenanceQuads, { prefixes })
const provenanceFile = context.outputsDir + '/provenance.ttl'
await fs.writeFile(provenanceFile, provenanceTurtle, 'utf8')
await context.buildingDataset.importFromFiles([provenanceFile], {
  defaultGraphName: `${context.baseIRI}graph/provenance`,
  overwriteAll: true,
})
