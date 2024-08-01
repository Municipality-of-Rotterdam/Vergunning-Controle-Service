import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenActivity } from '@bronnen/RuimtelijkePlannen.js'
import { Controle } from '@root/core/Controle.js'
import { dct, rdfs, skos, xsd } from '@core/helpers/namespaces.js'
import factory from '@rdfjs/data-model'

export type Data = { bestemmingsplan: any; teksten: any }

export default class _ extends Controle<StepContext, Data> {
  public name = 'Ruimtelijke plannen'

  async run({ footprint, footprintT1, baseIRI }: StepContext): Promise<Data> {
    const response = await new RuimtelijkePlannenActivity({
      url: '/plannen/_zoek',
      body: { _geo: { contains: footprintT1 } },
      params: { planType: 'bestemmingsplan' },
    }).run({ baseIRI })

    let plans = response['_embedded']['plannen']

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

    this.info['Bestemmingsplan'] = { text: `${bestemmingsplan.naam} (${bestemmingsplan.id})`, url }

    // TODO: If there are many articles, this will only return the first 100.
    const responseTeksten = await new RuimtelijkePlannenActivity({
      url: `/plannen/${bestemmingsplan.id}/artikelen/_zoek`,
      body: { _geo: { intersects: footprint } },
      params: { expand: 'bestemmingsvlakken' },
    }).run({ baseIRI })

    this.apiResponse = { response, responseTeksten }

    return { bestemmingsplan, teksten: responseTeksten['_embedded']['teksten'] }
  }
}
