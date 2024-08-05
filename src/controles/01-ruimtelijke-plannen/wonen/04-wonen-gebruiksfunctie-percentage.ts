import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenActivity } from '@bronnen/RuimtelijkePlannen.js'
import { Data as RPData } from '../common.js'
import { Controle } from '@root/core/Controle.js'
import { projectGeoJSON } from '@root/core/helpers/crs.js'
import { Geometry } from 'geojson'

type Data = {
  gebruiksfunctie?: string
}

/** Given: Een IFC-model positioneert na georeferentie geheel binnen een IMRO bestemmingsvlak “Wonen”
of IMOW gebiedsaanwijzing/IMOW locatie noemer: Wonen.
And: Het ingediend IFC-model heeft een ifcSpace Gebruiksfunctie Name Woonfunctie, ifcSpace
Objecttype BVO en optioneel een IfcSpace Objecttype Nevengebruiksfunctie Name: Bedrijfsfunctie
But: de IfcSpace bedrijfsfunctie niet meer is dan 30% van de space BVO.
Then: Het gebruik van het gebouw is in overeenstemming met de specifieke gebruiksregels. */

export default class _ extends Controle<StepContext & RPData, Data> {
  public name = 'Bedrijfsfunctie'

  async run(context: StepContext & RPData): Promise<Data> {
    const { baseIRI, footprintT1, bestemmingsplan } = context

    const reference = `<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_2_BESTEMMINGSREGELS">2</a>.<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_23_Wonen">23</a>.3.1a`
    this.info['Beschrijving'] =
      `<span class="article-ref">${reference}</span> Woningen mogen mede worden gebruikt voor de uitoefening van een aan huis gebonden beroep of bedrijf, mits: de woonfunctie in overwegende mate gehandhaafd blijft, waarbij het bruto vloeroppervlak van de woning voor ten hoogste 30%, mag worden gebruikt voor een aan huis gebonden beroep of bedrijf`

    this.info['Testvoetafdruk 1'] = {
      type: 'Feature',
      properties: {
        name: 'Testvoetafdruk 1',
        style: { color: '#ff0000' },
      },
      geometry: projectGeoJSON(footprintT1) as Geometry,
    }

    const response = await new RuimtelijkePlannenActivity({
      url: `plannen/${bestemmingsplan.id}/bestemmingsvlakken/_zoek`,
      body: { _geo: { contains: footprintT1 } },
      params: { expand: 'geometrie' },
    }).run({ baseIRI })
    this.apiResponse = response

    const bestemmingsvlakken: any[] = response['_embedded']['bestemmingsvlakken'].filter(
      (f: any) => f.type == 'enkelbestemming',
    )

    this.log(`${bestemmingsvlakken.length} enkelbestemmingsvlakken gevonden`)

    if (bestemmingsvlakken.length == 0) {
      this.status = true
      this.info['Resultaat'] = 'Niet van toepassing'
      return {}
    } else if (bestemmingsvlakken.length != 1) {
      this.status = false
      this.info['Resultaat'] = `Er zijn meerdere enkelbestemmingsvlakken op deze locatie.`
      return {}
    } else {
      const vlak = bestemmingsvlakken[0]
      const gebruiksfunctie: string = vlak.naam
      this.log(`Bestemmingsvlak is van type ${gebruiksfunctie}`)

      this.info['Bestemmingsvlak'] = {
        type: 'Feature',
        properties: {
          name: `Bestemmingsvlak "${gebruiksfunctie}"`,
        },
        geometry: projectGeoJSON(vlak.geometrie) as Geometry,
      }

      const results = await this.runSparql(context, { name: '04-wonen-gebruiksfunctie-percentage', version: 5 })

      if (results.length) {
        const bedrijfsfunctie = results[0].result
        this.status = bedrijfsfunctie < 30
        this.info['Resultaat'] = `Bedrijfsfunctie is ${bedrijfsfunctie}%.`
      } else {
        this.status = false
        this.info['Resultaat'] = `Kon de bedrijfsfunctie niet vaststellen.`
      }

      return { gebruiksfunctie }
    }
  }

  applicable({ gebruiksfunctie }: Data): boolean {
    return gebruiksfunctie ? gebruiksfunctie.toLowerCase() == 'wonen' : false
  }
}
