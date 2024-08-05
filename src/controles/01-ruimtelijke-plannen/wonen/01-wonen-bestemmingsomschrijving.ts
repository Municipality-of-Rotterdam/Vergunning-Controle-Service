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
  geometry: Geometry
  reference?: string
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

    const vlak = bestemmingsvlakken[0]
    const gebruiksfunctie: string = vlak['naam']
    const geometry: Geometry = vlak['geometrie']

    // let reference = ``
    // for (const zone of bestemmingsvlakken) {
    //   if (zone.naam == 'Wonen') {
    //     reference = `<a href="${zone.verwijzingNaarTekst}">Artikel ${zone.artikelnummer}</a>`
    //     break
    //   }
    // }

    // TODO: No hardcoding
    const reference = `<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_2_BESTEMMINGSREGELS">2</a>.<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_23_Wonen">23</a>.1a`
    this.info['Beschrijving'] =
      `<span class="article-ref">${reference}</span> De voor 'Wonen' aangewezen gronden zijn bestemd voor woningen, met de daarbij behorende voorzieningen zoals (inpandige) bergingen en garageboxen, aanbouwen, bijgebouwen, alsmede tuinen, groen, water en ontsluitingswegen en -paden`

    const results: any[] = await this.runSparql(context, {
      name: '1-Wonen-bestemmingsomschrijving',
      params: { allowed: gebruiksfunctie },
    })

    if (results.length) {
      const failures = results.filter((r: any) => r.valid != 'true')
      let message = ''
      if (failures.length > 0) {
        message += '<ul>'
        for (const { functie, space } of failures) {
          message += `<li>Ruimte <a href=${space} target="_blank">${space}</a> met de gebruiksfunctie "${functie}" mag niet gepositioneerd worden in een bestemmingsomschrijving "${gebruiksfunctie}".</li>`
        }
        message += '</ul>'
      } else {
        message = `Op de locatie geldt de bestemmingsomschrijving "${gebruiksfunctie}". De aanvraag voldoet hieraan.`
      }
      this.status = failures.length == 0
      this.info['Resultaat'] = message
    } else {
      this.status = false
      this.info['Resultaat'] = 'Kon geen gebruiksfunctie voor het gebouw vinden.'
    }

    return { gebruiksfunctie, geometry }
  }
}
