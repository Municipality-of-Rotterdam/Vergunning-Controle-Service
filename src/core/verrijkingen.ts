import { readdir } from 'fs/promises'

import { StepContext } from '@core/executeSteps.js'
import { Store as TriplyStore } from '@triplydb/data-factory'
// import { GeoData } from '@verrijkingen/geoReference.js'
import { Activity } from './Activity.js'
import { GrapoiPointer } from './helpers/grapoi.js'
import { rdfs, xsd } from './helpers/namespaces.js'
import factory from '@rdfjs/data-model'
import { Polygon } from 'geojson'

export type Verrijkingen = {
  footprint: Polygon
  elongation: number
}

export const verrijk = new Activity(
  {
    name: 'Verrijkingen',
    description:
      'Verrijking met de voetprint van het gebouw en georeferentie (basispunt en rotatie) in linked data, en een 3D model',
  },
  async (context: StepContext, thisActivity: Activity<any, any>): Promise<Verrijkingen> => {
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

    thisActivity.provenance?.addOut(rdfs('seeAlso'), factory.literal(`${context.baseIRI}`, xsd('anyURI')))

    return output as Verrijkingen
  },
)
