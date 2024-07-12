import { BaseGroep } from '@core/BaseGroep.js'
import { StepContext } from '@root/core/executeSteps.js'

export type GroepsData = { geoShape: any }

export default class GroepWelstand extends BaseGroep<GroepsData> {
  public naam = 'Welstand'

  async voorbereiding(context: StepContext): Promise<GroepsData> {
    const coordinates = context.voetprintCoordinates
    const geoShape = { _geo: { contains: { type: 'Polygon', coordinates: [coordinates] } } }
    return { geoShape }
  }
}
