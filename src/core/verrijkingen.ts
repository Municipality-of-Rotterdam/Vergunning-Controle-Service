import { readdir } from 'fs/promises'

import { StepContext } from '@core/executeSteps.js'
import { Store as TriplyStore } from '@triplydb/data-factory'
import { GeoData } from '@verrijkingen/geoReference.js'

export type Verrijkingen = {
  voetprintCoordinates: number[][]
  geoData: GeoData
}

export const verrijk = async (context: StepContext): Promise<Verrijkingen> => {
  context.verrijkingenDataset = new TriplyStore()

  const verrijkingen = (await readdir('./src/verrijkingen')).sort()

  const output = {}

  for (const verrijking of verrijkingen) {
    if (verrijking.endsWith('.md')) continue

    const verrijkingsModule = await import(`../verrijkingen/${verrijking.replace('.ts', '.js')}`).then(
      (module) => module.default,
    )

    const additionalOutput = await verrijkingsModule(context)
    if (additionalOutput) Object.assign(output, additionalOutput)
  }

  return output as Verrijkingen
}
