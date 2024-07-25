import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'
import { Controle } from '@root/core/Controle.js'
import { dct, rdfs, skos, xsd } from '@core/helpers/namespaces.js'
import factory from '@rdfjs/data-model'

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

    let url: string = bestemmingsplan['heeftOnderdelen'].filter((o: any) => o['type'] == 'toelichting')[0][
      'externeReferenties'
    ][0]

    this.pointer.addOut(dct('source'), (bp: any) => {
      bp.addOut(skos('prefLabel'), `${bestemmingsplan.naam} (${bestemmingsplan.id})`)
      bp.addOut(rdfs('seeAlso'), factory.literal(url, xsd('anyUri')))
    })

    this.info['Bestemmingsplan'] = { text: `${bestemmingsplan.naam} (${bestemmingsplan.id})`, url }

    return { bestemmingsplan, geoShape }
  }
}
