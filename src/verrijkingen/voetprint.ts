import grapoi from 'grapoi'
import fs from 'fs/promises'
import N3 from 'n3'
import { Quad } from 'n3'
import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'
import { StepContext } from '@root/core/executeSteps.js'
import { qudt } from '@core/helpers/namespaces.js'
import factory from '@rdfjs/data-model'
import { GrapoiPointer } from '@root/core/helpers/grapoi.js'

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

  let polygon = await fs.readFile(filePath, 'utf-8')
  const parser = new N3.Parser()
  const quads = parser.parse(polygon)
  for (const quad of quads) {
    if (quad) verrijkingenDataset.add(quad as any)
  }

  const elongationNode = factory.namedNode(`${gebouwSubject}/footprint/elongation`)
  const pointer: GrapoiPointer = grapoi({
    dataset: verrijkingenDataset,
    term: elongationNode,
  })
  const elongation = pointer.out(qudt('numericValue')).value
  log(`Elongation: ${elongation}`)

  // for (const quad of pointer.out()) {
  //   log(quad)
  // }
  if (!elongation) {
    throw new Error(`could not find elongation for ${elongationNode.value}`)
  }

  log(`De voetprint is toegevoegd aan de verrijkingen linked data graaf`, 'Voetprint')

  /**
   * Temporary stub
   * TODO remove this when we have better test data.
   */
  polygon = `POLYGON ((84116 431825, 84121 431825, 84121 431829, 84116 431829, 84116 431825))`
  const voetprintCoordinates = polygon
    .split('((')
    .pop()!
    .replace('))', '')
    .split(',')
    .map((pair) => pair.trim().split(' ').map(parseFloat))

  return {
    voetprintCoordinates,
    elongation,
  }
}
