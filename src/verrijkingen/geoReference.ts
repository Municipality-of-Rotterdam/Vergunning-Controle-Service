import { readFile } from 'fs/promises'

import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'
import { shp, xsd } from '@helpers/namespaces.js'
import factory from '@rdfjs/data-model'
import { StepContext } from '@root/core/executeSteps.js'

const executeCommand = createExecutor('verrijking', import.meta, 'GeoReference')

const log = createLogger('verrijking', import.meta)

export type GeoData = { Delta_X?: number; Delta_Y?: number; Height?: number; Rotation?: number }

export default async function GeoReference({
  outputsDir,
  inputIfc,
  gebouwSubject,
  datasetName,
  verrijkingenDataset,
}: Pick<StepContext, 'outputsDir' | 'inputIfc' | 'gebouwSubject' | 'verrijkingenDataset' | 'datasetName'>) {
  log('Uitlezen van IFC en omzetten naar CSV', 'GeoReference')

  const command = `python3 ./src/tools/georeference.py -ifc_file "${inputIfc}" -o "${outputsDir}/${datasetName}"`
  await executeCommand(command)

  const csv = await readFile(`${outputsDir}/${datasetName}transformation_parameters.csv`, { encoding: 'utf8' })

  const [headers, row] = csv
    .replaceAll('\r', '')
    .split('\n')
    .map((line) => line.split(','))
  const geoData: GeoData = {}

  for (const [index, header] of headers.entries()) {
    geoData[header as keyof GeoData] = parseFloat(row[index])
    const quad = factory.quad(gebouwSubject, shp(header), factory.literal(row[index], xsd('double')))
    verrijkingenDataset.add(quad as any)
  }

  return {
    geoData,
  }
}
