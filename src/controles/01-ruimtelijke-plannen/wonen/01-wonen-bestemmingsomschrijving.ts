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
}

export default class _ extends Controle<StepContext & RPData, Data> {
  public name = 'Bestemmingsomschrijving'
  public tekst = `De voor 'Wonen' aangewezen gronden zijn bestemd voor woningen, met de daarbij behorende voorzieningen zoals (inpandige) bergingen en garageboxen, aanbouwen, bijgebouwen, alsmede tuinen, groen, water en ontsluitingswegen en -paden`
  public verwijzing = `Hoofdstuk 2 Bestemmingsregels 
		Artikel 23 Wonen lid 
			23.1 Bestemmingsomschrijving 
				a. `

  async run({ baseIRI, bestemmingsplan, footprintT1, footprint }: StepContext & RPData): Promise<Data> {
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

    // if (bestemmingsvlakken.length > 1) {
    //   throw new Error('Op dit moment mag er maar 1 enkelbestemmingsvlak bestaan.')
    // }
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
            fillColor: color,
            fillOpacity: 0.1,
          },
        },
        geometry,
      })
    }

    const vlak = bestemmingsvlakken[0]
    const gebruiksfunctie: string = vlak['naam']
    const geometry: Geometry = vlak['geometrie']

    this.info['Bestemmingsvlakken'] = {
      type: 'FeatureCollection',
      features,
    }
    this.info['Voetafdruk van het gebouw'] = {
      type: 'Feature',
      properties: {
        name: 'Voetafdruk van het gebouw',
      },
      geometry: projectGeoJSON(footprint) as Geometry,
    }

    return { gebruiksfunctie, geometry }
  }

  sparqlUrl = 'https://demo.triplydb.com/rotterdam/-/queries/1-Wonen-bestemmingsomschrijving'
  sparql = ({ gebruiksfunctie }: Data) => `prefix express: <https://w3id.org/express#>
      prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>

      # Aanname: een IfcSpace heeft 1 Gebruiksfunctie

      select distinct ?space ?spacelabel ?functie where {
        graph ?g {
        ?this a ifc:IfcBuilding.

        [] ifc:relatingObject_IfcRelAggregates ?this;
          ifc:relatedObjects_IfcRelAggregates ?storey.

        [] a ifc:IfcRelAggregates ;
          ifc:relatingObject_IfcRelAggregates ?storey;
          ifc:relatedObjects_IfcRelAggregates ?space.

        ?space ifc:longName_IfcSpatialElement/express:hasString ?spacelabel .

        [] a ifc:IfcRelDefinesByProperties ;
          ifc:relatedObjects_IfcRelDefinesByProperties ?space ;
          ifc:relatingPropertyDefinition_IfcRelDefinesByProperties ?IfcPropertySet .

        ?IfcPropertySet ifc:hasProperties_IfcPropertySet ?IfcPropertySingleValue .

        ?IfcPropertySingleValue ifc:nominalValue_IfcPropertySingleValue/express:hasString ?functie ;
                                ifc:name_IfcProperty/express:hasString "Gebruiksfunctie" .

        filter(lcase(str(?functie)) != "${gebruiksfunctie.toLowerCase()}")
        }
      }`

  bericht({ gebruiksfunctie }: Data): string {
    if (this.status === true)
      return `Op de locatie geldt de bestemmingsomschrijving ${gebruiksfunctie}. De aanvraag voldoet hieraan.`
    else
      return `Ruimte <a href={?space} target="_blank">{?space}</a> met de gebruiksfunctie "{?functie}" mag niet gepositioneerd worden in een bestemmingsomschrijving "${gebruiksfunctie}".`
  }
}
