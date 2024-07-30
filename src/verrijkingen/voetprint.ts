import grapoi from 'grapoi'
import fs from 'fs/promises'
import N3 from 'n3'
import { Quad } from 'n3'
import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'
import { StepContext } from '@root/core/executeSteps.js'
import { qudt, geo } from '@core/helpers/namespaces.js'
import factory from '@rdfjs/data-model'
import { GrapoiPointer } from '@root/core/helpers/grapoi.js'
import { wktToGeoJSON } from '@terraformer/wkt'

const executeCommand = createExecutor('verrijking', import.meta, 'voetprint')

const log = createLogger('verrijking', import.meta)

export default async function Voetprint({
  outputsDir,
  inputIfc,
  gebouwSubject,
  verrijkingenDataset,
}: Pick<StepContext, 'outputsDir' | 'inputIfc' | 'gebouwSubject' | 'verrijkingenDataset'>) {
  const filePath = `${outputsDir}/footprint.ttl`

  await executeCommand(
    `python3 ./src/tools/footprint.py "${inputIfc}" "${gebouwSubject}" IfcRoof,IfcSlab > ${filePath}`,
  )

  log(`Data extract gemaakt`, 'Voetprint')

  let footprintFile = await fs.readFile(filePath, 'utf-8')
  const parser = new N3.Parser()
  const quads = parser.parse(footprintFile)
  for (const quad of quads) {
    if (quad) verrijkingenDataset.add(quad as any)
  }

  const footprint: string = grapoi({
    dataset: verrijkingenDataset,
    term: factory.namedNode(`${gebouwSubject}/footprint`),
  }).out(geo('asWKT')).value

  const elongationNode = factory.namedNode(`${gebouwSubject}/footprint/elongation`)
  const pointer: GrapoiPointer = grapoi({
    dataset: verrijkingenDataset,
    term: elongationNode,
  })
  const elongationValue = pointer.out(qudt('numericValue')).value
  const elongation: number = typeof elongationValue == 'number' ? elongationValue : parseFloat(elongationValue)
  log(`Elongation: ${elongation}`, 'Elongation')

  if (!elongation) {
    throw new Error(`could not find elongation for ${elongationNode.value}`)
  }

  log(`De voetprint is toegevoegd aan de verrijkingen linked data graaf`, 'Voetprint')

  return {
    footprint: wktToGeoJSON(footprint.replace(/^<.*>\s/, '').toUpperCase()),
    // TODO: Remove test footprints once the process is improved
    footprintT1: wktToGeoJSON(`POLYGON ((84165 431938, 84172 431938, 84172 431943, 84165 431943, 84165 431938))`),
    footprintT2: wktToGeoJSON(`POLYGON ((84116 431825, 84121 431825, 84121 431829, 84116 431829, 84116 431825))`),
    elongation,
  }
}
