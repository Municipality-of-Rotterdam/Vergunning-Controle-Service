import { Controle } from '@core/Controle.js'
import { Data as RPData } from './common.js'
import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenActivity } from '@bronnen/RuimtelijkePlannen.js'
import { SparqlActivity } from '@root/core/Activity.js'
import namespace from '@rdfjs/namespace'

type Data = {
  gebruiksfunctie: string
}

export default class _ extends Controle<Controle<StepContext, RPData>, Data> {
  public name = 'Bestemmingsomschrijving'
  public tekst = `De voor 'Wonen' aangewezen gronden zijn bestemd voor woningen, met de daarbij behorende voorzieningen zoals (inpandige) bergingen en garageboxen, aanbouwen, bijgebouwen, alsmede tuinen, groen, water en ontsluitingswegen en -paden`
  public verwijzing = `Hoofdstuk 2 Bestemmingsregels 
		Artikel 23 Wonen lid 
			23.1 Bestemmingsomschrijving 
				a. `

  async _run(context: Controle<StepContext, RPData>): Promise<Data> {
    const data = context.data
    const response = await new RuimtelijkePlannenActivity({
      url: `plannen/${data?.bestemmingsplan.id}/bestemmingsvlakken/_zoek`,
      body: data?.geoShape,
      //@ts-ignore
    }).run(context.context?.context)

    const bestemmingsvlakken: any[] = response['_embedded']['bestemmingsvlakken'].filter(
      (f: any) => f.type == 'enkelbestemming',
    )

    this.log(`${bestemmingsvlakken.length} enkelbestemmingsvlakken gevonden`)

    if (bestemmingsvlakken.length != 1) {
      throw new Error('Op dit moment mag er maar 1 enkelbestemmingsvlak bestaan.')
    }

    const vlak = bestemmingsvlakken[0]
    const gebruiksfunctie: string = vlak['naam']

    return { gebruiksfunctie }
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
    return `Ruimte <a href={?space} target="_blank">{?space}</a> met de gebruiksfunctie "{?functie}" mag niet gepositioneerd worden in een bestemmingsomschrijving "${gebruiksfunctie}".`
  }
}
