import { Controle } from '@root/core/Controle.js'
import { projectGeoJSON } from '@root/core/helpers/crs.js'
import { Geometry } from 'geojson'
import { StepContext } from '@root/core/executeSteps.js'

export default class _ extends Controle<StepContext, {}> {
  public name = 'Vergunningscontroleservice'

  async run({ footprint }: StepContext): Promise<{}> {
    this.info['Voetafdruk van het gebouw'] = {
      type: 'Feature',
      properties: {
        name: 'Voetafdruk van het gebouw',
        style: { color: '#000000' },
      },
      geometry: projectGeoJSON(footprint) as Geometry,
    }
    return {}
  }
}
