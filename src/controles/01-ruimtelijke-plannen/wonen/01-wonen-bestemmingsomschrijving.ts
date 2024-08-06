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

const mapping: Record<string, string> = {
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
      return { gebruiksfunctie: '' }
    } else {
      const uniques = (xs: string[]) => [...new Set<string>(xs)]
      const natural = (xs: string[]) => xs.map((x) => `"${x}"`).join(', ')

      // Analyse: welke bestemmingen gelden hier?
      const bestemmingen: string[] = uniques(bestemmingsvlakken.map((vlak) => vlak['naam']))

      // Analyse: welke gebruiksfuncties heeft de aanvraag?
      const results: any[] = await this.runSparql(context, {
        name: '01-wonen-bestemmingsomschrijving',
        //version: 16,
      })
      const gebruiksfuncties = uniques(results.map(({ functie }) => functie))

      if (results.length) {
        // Analyse
        let message =
          gebruiksfuncties.length > 1
            ? `De functies binnen de aanvraag zijn ${natural(gebruiksfuncties)} `
            : `De functie binnen de aanvraag is ${natural(gebruiksfuncties)} `

        message +=
          bestemmingen.length > 1
            ? `en de toegestane bestemmingen zijn ${natural(bestemmingen)}. `
            : `en de toegestane bestemming is ${natural(bestemmingen)}. `

        const failures = []
        for (const f of gebruiksfuncties) {
          const conflicts = bestemmingen.filter((x) => f != (mapping[x] ?? x))

          if (conflicts.length) {
            failures.push(
              `<li>De gebruiksfunctie ${f} past niet binnen de bestemming(en) ${natural(conflicts)} op deze locatie.</li>`,
            )
          }
        }

        if (failures.length) {
          message += `<ul>${failures.join('')}</ul>`
        } else {
          message += 'De aangevraagde functies passen binnen de toegestame bestemmingen van het bestemmingsplan. '
        }

        this.status = failures.length == 0
        this.info['Resultaat'] = message
      } else {
        this.status = false
        this.info['Resultaat'] = 'Kon geen gebruiksfunctie voor het gebouw vinden.'
      }

      return { gebruiksfunctie: gebruiksfuncties.join('; ') }
    }
  }
}
