import { Controle } from '@core/Controle.js'
import { Data as RPData } from '../common.js'
import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenActivity } from '@bronnen/RuimtelijkePlannen.js'
import { SparqlActivity } from '@root/core/Activity.js'
import namespace from '@rdfjs/namespace'
import { Geometry, Feature } from 'geojson'
import { projectGeoJSON } from '@root/core/helpers/crs.js'

type Data = {
  gebruiksfunctie: string
  reference?: string
}

const mapping = {
  Wonen: 'Woonfunctie',
  Kantoor: 'Kantoorfunctie',
}

export default class _ extends Controle<StepContext & RPData, Data> {
  public name = 'Bestemmingsomschrijving'

  async run(context: StepContext & RPData): Promise<Data> {
    const { baseIRI, bestemmingsplan, footprint } = context
    const response = await new RuimtelijkePlannenActivity({
      url: `plannen/${bestemmingsplan.id}/bestemmingsvlakken/_zoek`,
      params: { expand: 'geometrie' },
      body: { _geo: { intersects: footprint } },
    }).run({ baseIRI })
    this.apiResponse = response // TODO remove

    const bestemmingsvlakken: any[] = response['_embedded']['bestemmingsvlakken'].filter(
      (f: any) => f.type == 'enkelbestemming',
    )
    this.log(`${bestemmingsvlakken.length} enkelbestemmingsvlakken gevonden`)

    const colors: Record<string, string> = {
      Wonen: '#0000aa',
      'Verkeer - Erf': '#999999',
      Tuin: '#00aa00',
    }

    const features: Feature[] = []
    for (const zone of bestemmingsvlakken) {
      const color = colors[zone['naam']] ?? '#aa0000'
      const gebruiksfunctie: string = zone['naam']
      const geometry: Geometry = zone['geometrie']
      features.push({
        type: 'Feature',
        properties: {
          name: `Bestemmingsvlak "${gebruiksfunctie}"`,
          style: {
            weight: 2,
            opacity: 1,
            color,
            fillOpacity: 0.3,
            fillColor: color,
          },
        },
        geometry,
      })
    }
    this.info['Bestemmingsvlakken'] = {
      type: 'FeatureCollection',
      features,
    }

    // TODO: No hardcoding
    const reference = `<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_2_BESTEMMINGSREGELS">2</a>.<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_23_Wonen">23</a>.1a`
    this.info['Beschrijving'] =
      `<span class="article-ref">${reference}</span> De voor 'Wonen' aangewezen gronden zijn bestemd voor woningen, met de daarbij behorende voorzieningen zoals (inpandige) bergingen en garageboxen, aanbouwen, bijgebouwen, alsmede tuinen, groen, water en ontsluitingswegen en -paden`

    if (bestemmingsvlakken.length == 0) {
      this.status = true
      this.info['Resultaat'] = 'Op de locatie van de aanvraag zijn geen bestemmingsvlakken.'
    } else {
      const bestemmingen: string[] = bestemmingsvlakken.map((vlak) => vlak['naam'])
      // @ts-ignore
      const gebruiksfuncties = bestemmingen.map((x: string) => mapping[x] ?? x)

      // let reference = ``
      // for (const zone of bestemmingsvlakken) {
      //   if (zone.naam == 'Wonen') {
      //     reference = `<a href="${zone.verwijzingNaarTekst}">Artikel ${zone.artikelnummer}</a>`
      //     break
      //   }
      // }

      const results: any[] = await this.runSparql(context, {
        name: '1-Wonen-bestemmingsomschrijving',
        version: 16,
      })

      if (results.length) {
        let message =
          gebruiksfuncties.length > 1
            ? `Op de locatie gelden de beschemmingsomschrijvingen ${gebruiksfuncties.join(`, `)}. `
            : `Op de locatie geldt de bestemmingsomschrijving ${gebruiksfuncties[0]}. `
        this.status = true

        let groupedResults: Record<string, string[]> = results.reduce((group: any, x: any) => {
          if (gebruiksfuncties.every((y) => y == x.functie)) {
            ;(group[x.functie] = group[x.functie] || []).push(x)
          }
          return group
        }, {})

        const failures = []
        for (const [functie, spaces] of Object.entries(groupedResults)) {
          if (spaces.length > 1)
            failures.push(
              `De aanvraag bevat ${spaces.length} ruimtes met een "${functie}" die hier niet gepositioneerd mag worden.`,
            )
          else
            failures.push(`De aanvraag bevat een ruimte met een "${functie}", die hier niet gepositioneerd mag worden.`)
          // const ruimtes = spaces.map((s: string) => `<a href="${s}" target="_blank">${s}</a>`).join(', ')
        }

        if (failures.length) {
          message += `<ul>${failures.map((x) => `<li>${x}</li>`)}</ul>`
        } else {
          message += 'De aanvraag voldoet hieraan. '
        }
        this.status = this.status && failures.length == 0

        this.info['Resultaat'] = message
      } else {
        this.status = false
        this.info['Resultaat'] = 'Kon geen gebruiksfunctie voor het gebouw vinden.'
      }

      return { gebruiksfunctie: gebruiksfuncties.join('; ') }
    }
  }
}
