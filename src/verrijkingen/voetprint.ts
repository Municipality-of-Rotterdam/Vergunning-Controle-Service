import fs from 'fs/promises'
import N3 from 'n3'
import { Quad } from 'n3'
import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'
import { StepContext } from '@root/core/executeSteps.js'

const executeCommand = createExecutor('verrijking', import.meta, 'footprint_approx')

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

  // const quad = factory.quad(
  //   gebouwSubject,
  //   geo('asWKT'),
  //   factory.literal(`<http://www.opengis.net/def/crs/EPSG/0/28992> ${polygon}`, geo('wktLiteral')),
  // )
  const parser = new N3.Parser()
  parser.parse(polygon, (error, quad, prefixes) => {
    if (quad) {
      log(quad)
      verrijkingenDataset.add(quad as any)
    }
    if (error) {
      throw error
    }
  })
  log(`Aantal quads in verrijkingenDataset: ${verrijkingenDataset.size}`)

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
  }
}
