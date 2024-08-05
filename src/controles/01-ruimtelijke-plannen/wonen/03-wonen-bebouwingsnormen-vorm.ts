import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenActivity } from '@bronnen/RuimtelijkePlannen.js'
import { Data as RPData } from '../common.js'
import { ifc } from '@helpers/namespaces.js'
import NamedNode from '@rdfjs/data-model/lib/NamedNode.js'
import { Controle } from '@root/core/Controle.js'
import { projectGeoJSON } from '@root/core/helpers/crs.js'
import { Geometry, Feature } from 'geojson'

export type Data = {
  bouwaanduiding?: NamedNode
}

const bouwaanduidingMapping: { [key: string]: NamedNode } = {
  'plat dak': ifc('FLAT_ROOF'),
}

// Function to get the value by key (name)
function bouwaanduidingNode(name: string): NamedNode {
  if (bouwaanduidingMapping.hasOwnProperty(name)) {
    return bouwaanduidingMapping[name]
  } else {
    throw new Error(`Onbekende bouwaanduiding "${name}"`)
  }
}

// Function to get the key by value (IFC code)
function bouwaanduidingTextByIfcCode(ifcCode: NamedNode): string {
  const name = Object.keys(bouwaanduidingMapping).find((key) => bouwaanduidingMapping[key] === ifcCode)
  if (name) {
    return name
  } else {
    throw new Error(`Onbekende IFC code "${ifcCode}"`)
  }
}

export default class _ extends Controle<StepContext & RPData, Data> {
  public name = 'Bebouwingsnormen: Vorm'

  async run(context: StepContext & RPData): Promise<Data> {
    const { bestemmingsplan, baseIRI, footprintT1 } = context

    // TODO: No hardcoding
    const reference = `<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_2_BESTEMMINGSREGELS">2</a>.<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_23_Wonen">23</a>.2.2c`
    this.info['Beschrijving'] =
      `<span class="article-ref">${reference}</span> Ter plaatse van de aanduiding "plat dak" dienen woningen plat te worden afgedekt`

    this.info['Testvoetafdruk 1'] = {
      type: 'Feature',
      properties: {
        name: 'Testvoetafdruk 1',
        style: { color: '#ff0000' },
      },
      geometry: projectGeoJSON(footprintT1) as Geometry,
    }

    const response = await new RuimtelijkePlannenActivity({
      url: `/plannen/${bestemmingsplan.id}/bouwaanduidingen/_zoek`,
      body: { _geo: { intersects: footprintT1 } },
      params: { expand: 'geometrie' },
    }).run({ baseIRI })
    this.apiResponse = response

    const bouwaanduidingen: any[] = response['_embedded']['bouwaanduidingen']

    this.log(`${bouwaanduidingen.length} bouwaanduidingen gevonden`)

    const geoBouwaanduidingen: Feature[] = []
    for (const bouwaanduiding of bouwaanduidingen) {
      geoBouwaanduidingen.push({
        type: 'Feature',
        properties: {
          name: `Bouwaanduiding ${bouwaanduiding.naam}`,
        },
        geometry: bouwaanduiding.geometrie,
      })
    }
    this.info['Bouwaanduidingen'] = {
      type: 'FeatureCollection',
      features: geoBouwaanduidingen,
    }

    if (bouwaanduidingen.length == 0) {
      this.status = true
      this.info['Resultaat'] = 'Niet van toepassing (geen bouwaanduidingen gevonden)'
      return {}
    } else if (bouwaanduidingen.length != 1) {
      this.status = false
      this.info['Resultaat'] = 'Er zijn meerdere bouwaanduidingen gevonden'
      return {}
    } else {
      const bouwaanduidingName: string = bouwaanduidingen[0]['naam']
      const bouwaanduiding = bouwaanduidingNode(bouwaanduidingName)

      this.log(`Bestemmingsvlak is van type ${bouwaanduiding.value} s`)

      const results = await this.runSparql(context, {
        name: '03-wonen-bebouwingsnormen-vorm',
        version: 3,
        params: { bouwaanduiding: bouwaanduiding.value },
      })

      if (results.length) {
        const failures = results.filter((x) => !x.valid)
        let message = `Op de locatie geldt een bouwaanduiding <a href="${bouwaanduiding.value}" target="_blank">${bouwaanduidingTextByIfcCode(bouwaanduiding)}</a>. `

        if (failures.length) {
          message += `De aanvraag voldoet hier niet aan: `
          for (const { roof, rooftype } of failures) {
            message += `Er is <a href=${roof} target="_blank">een dak</a> met type "${rooftype}. `
          }
        } else {
          message += `De aanvraag voldoet hieraan.`
        }

        this.status = !failures.length
        this.info['Resultaat'] = message
      } else {
        this.status = false
        this.info['Resultaat'] = 'Kon geen daken vinden.'
      }

      return { bouwaanduiding }
    }
  }
}
