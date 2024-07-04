import { BaseGroep } from '@core/BaseGroep.js'
import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'

export type GroepsData = { bestemmingsplan: any; geoShape: any }

export default class GroepRuimtelijkePlannen extends BaseGroep<GroepsData> {
  public naam = 'Ruimtelijke plannen'

  async voorbereiding(context: StepContext): Promise<GroepsData> {
    const coordinates = context.voetprintCoordinates
    const ruimtelijkePlannen = new RuimtelijkePlannenAPI(process.env.RP_API_TOKEN ?? '')
    const geoShape = { _geo: { contains: { type: 'Polygon', coordinates: [coordinates] } } }

    let plans = (await ruimtelijkePlannen.plannen(geoShape, { planType: 'bestemmingsplan' }))['_embedded']['plannen']

    this.log(`Bestemmingsplannen horende bij de voetafdruk: ${plans.map((plan: any) => `${plan.id}`).join('; ')}`)

    plans = plans.filter(
      (plan: any) =>
        !plan.isParapluplan && !(plan.dossier?.status in ['in voorbereiding', 'vastgesteld', 'niet in werking']),
    )

    this.log(`Relevante plannen zijn: ${plans.map((plan: any) => `${plan['id']}`).join('; ')}`)

    plans.sort((a: any, b: any) => {
      const x = a['planstatusInfo']['datum']
      const y = b['planstatusInfo']['datum']
      if (x < y) return -1
      if (y < x) return 1
      return 0
    })

    const bestemmingsplan = plans[plans.length - 1]

    this.log(`Geselecteerd: ${bestemmingsplan.id}`)

    return { bestemmingsplan, geoShape }
  }
}
