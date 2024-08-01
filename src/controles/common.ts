import { Controle } from '@root/core/Controle.js'
import { projectGeoJSON } from '@root/core/helpers/crs.js'
import { Geometry } from 'geojson'
import { StepContext } from '@root/core/executeSteps.js'

export default class _ extends Controle<StepContext, {}> {
  public name = 'Vergunningscontroleservice'

  async run({ footprint, footprintT1, footprintT2 }: StepContext): Promise<{}> {
    this.info['Testvoetafdruk 1'] = {
      type: 'Feature',
      properties: {
        name: 'Testvoetafdruk 1',
        style: { color: '#ff0000' },
      },
      geometry: projectGeoJSON(footprintT1) as Geometry,
    }
    this.info['Testvoetafdruk 2'] = {
      type: 'Feature',
      properties: {
        name: 'Testvoetafdruk 2',
        style: { color: '#aa0000' },
      },
      geometry: projectGeoJSON(footprintT2) as Geometry,
    }
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
