import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'
import { Controle } from '@root/core/Controle.js'

export type Data = { bestemmingsplan: any; geoShape: any }

export default class _ extends Controle<Controle<any, StepContext>, Data> {
  public name = 'Ruimtelijke plannen'

  async _run(context: Controle<any, StepContext>): Promise<Data> {
    const ruimtelijkePlannen = new RuimtelijkePlannenAPI(process.env.RP_API_TOKEN ?? '')
    const geoShape = { _geo: { contains: this.context?.context?.footprint } }
    this.log(JSON.stringify(geoShape))

    const apiResponse = await ruimtelijkePlannen.plannen(geoShape, { planType: 'bestemmingsplan' })
    this.apiResponse = apiResponse
    let plans = apiResponse['_embedded']['plannen']

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
