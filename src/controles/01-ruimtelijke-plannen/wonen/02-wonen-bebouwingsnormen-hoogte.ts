import { RuimtelijkePlannenActivity } from '@bronnen/RuimtelijkePlannen.js'
import { Data as RPData } from '../common.js'
import { StepContext } from '@root/core/executeSteps.js'
import { Controle } from '@root/core/Controle.js'
import { projectGeoJSON } from '@root/core/helpers/crs.js'
import { Geometry, Feature } from 'geojson'

type Data = {
  max: number
}

export default class _ extends Controle<StepContext & RPData, Data> {
  public name = 'Bebouwingsnormen: Hoogte'

  async run(context: StepContext & RPData): Promise<Data> {
    const { baseIRI, bestemmingsplan, footprint } = context
    const response = await new RuimtelijkePlannenActivity({
      url: `/plannen/${bestemmingsplan.id}/maatvoeringen/_zoek`,
      body: { _geo: { intersects: footprint } },
      params: { expand: 'geometrie' },
    }).run({ baseIRI })
    this.apiResponse = response // TODO remove

    const maatvoeringen: any[] = response['_embedded']['maatvoeringen'].filter(
      (maatvoering: any) => maatvoering['naam'] == 'maximum aantal bouwlagen',
    )

    this.log(`${maatvoeringen.length} "maximum aantal bouwlagen" maatvoeringen gevonden`)

    const maxima: number[] = []
    const geoMaatvoeringen: Feature[] = []
    for (const maatvoering of maatvoeringen) {
      const waardes = maatvoering.omvang.map((x: any) => parseInt(x.waarde))
      maxima.push(...waardes)
      geoMaatvoeringen.push({
        type: 'Feature',
        properties: {
          name: `${maatvoering.naam}: ${JSON.stringify(waardes)}`,
        },
        geometry: maatvoering.geometrie,
      })
    }

    if (maxima.length) {
      const max = Math.min(...maxima)

      this.info['Maatvoeringen'] = {
        type: 'FeatureCollection',
        features: geoMaatvoeringen,
      }

      // TODO: No hardcoding
      const reference = `<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_2_BESTEMMINGSREGELS">2</a>.<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_23_Wonen">23</a>.2.2`
      this.info['Beschrijving'] =
        `<span class="article-ref">${reference}</span> Toegestane hoogte verdiepingen. De bouwhoogte van gebouwen mag niet meer bedragen dan met de aanduiding "maximum aantal bouwlagen" op de verbeelding is aangegeven.`

      this.log(`${max} maximum aantal bouwlagen`)

      const results = await this.runSparql(context, {
        name: '2-Wonen-bebouwingsnormen-hoogte',
        params: { max: max.toString() },
      })

      this.status = !results || (Array.isArray(results) && results.every((r: any) => r.valid))

      let message = `Op de locatie van de aanvraag is het maximaal aantal toegestane bouwlagen ${max}. `
      if (this.status === true) message += `De aanvraag voldoet hieraan.`
      else {
        message += `<a href={?this} target="_blank">De aanvraag</a> bevat {?aantalVerdiepingen} bouwlagen. Hiermee overschrijdt de aanvraag de maximaal toegestane bouwhoogte.`
      }
      this.info['Resultaat'] = message

      return { max }
    } else {
      this.status = true
      this.info['Resultaat'] = `Er zijn geen maatvoeringen gevonden voor de gegeven locatie.`
      return { max: Number.MAX_VALUE }
    }
  }
}
