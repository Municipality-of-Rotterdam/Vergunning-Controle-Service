import { BaseControle } from '@core/BaseControle.js'
import { GroepsData } from '@root/controles/01-ruimtelijke-plannen/ruimtelijke-plannen.js'
import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'

type SparqlInputs = {
  gebruiksfunctie: string
}

export default class Controle2WonenBestemmingsomschrijving extends BaseControle<SparqlInputs, GroepsData> {
  public naam = 'Bestemmingsomschrijving'
  public tekst = `De voor 'Wonen' aangewezen gronden zijn bestemd voor woningen, met de daarbij behorende voorzieningen zoals (inpandige) bergingen en garageboxen, aanbouwen, bijgebouwen, alsmede tuinen, groen, water en ontsluitingswegen en -paden`
  public verwijzing = `Hoofdstuk 2 Bestemmingsregels 
		Artikel 23 Wonen lid 
			23.1 Bestemmingsomschrijving 
				a. `

  async voorbereiding(context: StepContext): Promise<SparqlInputs> {
    const ruimtelijkePlannen = new RuimtelijkePlannenAPI(process.env.RP_API_TOKEN ?? '')
    const data = this.groepData()
    const response = await ruimtelijkePlannen.bestemmingsvlakZoek(data.bestemmingsplan.id, data.geoShape)
    this.apiResponse = response
    const bestemmingsvlakken: any[] = response['_embedded']['bestemmingsvlakken'].filter(
      (f: any) => f.type == 'enkelbestemming',
    )

    this.log(`${bestemmingsvlakken.length} enkelbestemmingsvlakken gevonden`)

    if (bestemmingsvlakken.length != 1) {
      throw new Error('Op dit moment mag er maar 1 enkelbestemmingsvlak bestaan.')
    }

    const gebruiksfunctie: string = bestemmingsvlakken[0]['naam']

    this.log(`Bestemmingsvlak ${gebruiksfunctie}`)

    return { gebruiksfunctie }
  }

  sparqlUrl = 'https://demo.triplydb.com/rotterdam/-/queries/1-Wonen-bestemmingsomschrijving'
  sparql({ gebruiksfunctie }: SparqlInputs): string {
    return `
      prefix express: <https://w3id.org/express#>
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
      }
    `
  }

  bericht({ gebruiksfunctie }: SparqlInputs): string {
    return `Ruimte <a href={?space} target="_blank">{?space}</a> heeft de gebruiksfunctie "{?functie}". Dit moet "${gebruiksfunctie}" zijn.`
  }
}
