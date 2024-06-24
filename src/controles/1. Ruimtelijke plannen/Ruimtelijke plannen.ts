import { BaseGroep } from '@core/BaseGroep.js'
import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'

export type GroepRuimtelijkePlannenData = { planIds: string[]; geoShape: any }

export default class GroepRuimtelijkePlannen extends BaseGroep<GroepRuimtelijkePlannenData> {
  public naam = 'Ruimtelijke plannen'

  /**
   * Dit is optioneel
   */
  async voorbereiding(context: StepContext): Promise<GroepRuimtelijkePlannenData> {
    const coordinates = context.voetprintCoordinates

    const ruimtelijkePlannen = new RuimtelijkePlannenAPI(process.env.RP_API_TOKEN ?? '')
    const geoShape = { _geo: { contains: { type: 'Polygon', coordinates: [coordinates] } } }

    const plans = (await ruimtelijkePlannen.plannen(geoShape, { planType: 'bestemmingsplan' }))['_embedded']['plannen']
    const planIds: string[] = plans.filter((plan: any) => !plan.isParapluplan).map((plan: any) => plan.id)

    this.log(`De volgende bestemmingsplan(nen) gevonden: \n${planIds.map((id) => `\t${id}`).join('\n')}`)

    return { planIds, geoShape }
  }
}
