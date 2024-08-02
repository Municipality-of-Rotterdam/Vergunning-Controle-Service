import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenActivity } from '@bronnen/RuimtelijkePlannen.js'
import { Data as RPData } from '../common.js'
import { Controle } from '@root/core/Controle.js'
import { projectGeoJSON } from '@root/core/helpers/crs.js'
import { Geometry } from 'geojson'

type Data = {
  gebruiksfunctie: string
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
    const reference = `<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_2_BESTEMMINGSREGELS">2</a>.<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_23_Wonen">23</a>.3.1a`
    this.info['Beschrijving'] =
      `<span class="article-ref">${reference}</span> Woningen mogen mede worden gebruikt voor de uitoefening van een aan huis gebonden beroep of bedrijf, mits: de woonfunctie in overwegende mate gehandhaafd blijft, waarbij het bruto vloeroppervlak van de woning voor ten hoogste 30%, mag worden gebruikt voor een aan huis gebonden beroep of bedrijf`

    const { baseIRI, footprintT1, bestemmingsplan } = context
    const response = await new RuimtelijkePlannenActivity({
      url: `plannen/${bestemmingsplan.id}/bestemmingsvlakken/_zoek`,
      body: { _geo: { contains: footprintT1 } },
    }).run({ baseIRI })
    this.apiResponse = response

    const bestemmingsvlakken: any[] = response['_embedded']['bestemmingsvlakken'].filter(
      (f: any) => f.type == 'enkelbestemming',
    )

    this.log(`${bestemmingsvlakken.length} enkelbestemmingsvlakken gevonden`)

    if (bestemmingsvlakken.length != 1) {
      throw new Error('Op dit moment mag er maar 1 enkelbestemmingsvlak bestaan.')
    }

    const gebruiksfunctie: string = bestemmingsvlakken[0]['naam']

    this.log(`Bestemmingsvlak is van type ${gebruiksfunctie}`)

    this.info['Testvoetafdruk 1'] = {
      type: 'Feature',
      properties: {
        name: 'Testvoetafdruk 1',
        style: { color: '#ff0000' },
      },
      geometry: projectGeoJSON(footprintT1) as Geometry,
    }

    await this.runSparql(context, { gebruiksfunctie })

    return { gebruiksfunctie }
  }

  applicable({ gebruiksfunctie }: Data): boolean {
    return gebruiksfunctie.toLowerCase() == 'wonen'
  }

  sparqlUrl = 'https://demo.triplydb.com/rotterdam/-/queries/4gebruiksfunctiePercentage/'
  sparql = () => {
    return `
prefix express: <https://w3id.org/express#>
prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>

select ?result ?success where {
  {
    #to find a gebruiksdoel
    {
      select (count(?space)*100 as ?totalK) where {
      graph ?g {
        ?this a ifc:IfcBuilding.

        [] ifc:relatingObject_IfcRelAggregates ?this;
           ifc:relatedObjects_IfcRelAggregates ?storey.

        [] ifc:relatingStructure_IfcRelContainedInSpatialStructure ?storey.
        [] ifc:relatedObjects_IfcRelAggregates ?storey.
        ?storey a ifc:IfcBuildingStorey;
                ifc:name_IfcRoot/express:hasString ?name.
        ?related ifc:relatedObjects_IfcRelAggregates ?space.
        ?space a ifc:IfcSpace;
               ifc:longName_IfcSpatialElement/express:hasString ?value.
        filter(regex(str(?value), "BVO", 'i'))
        ?Property a ifc:IfcRelDefinesByProperties;
                  ifc:relatedObjects_IfcRelDefinesByProperties ?space;
                  ifc:relatingPropertyDefinition_IfcRelDefinesByProperties ?set.
        ?set a ifc:IfcPropertySet;
             ifc:hasProperties_IfcPropertySet ?single.
        ?single ifc:nominalValue_IfcPropertySingleValue/express:hasString ?func.
        # filter(?func!="01")
        filter(regex(str(?func), "kantoor", 'i'))
      }
      }
      limit 1
    }
  }

  {
    select (count(?space) as ?totalW) where {
    graph ?g {
      ?this a ifc:IfcBuilding.

      [] ifc:relatingObject_IfcRelAggregates ?this;
         ifc:relatedObjects_IfcRelAggregates ?storey.

      [] ifc:relatingStructure_IfcRelContainedInSpatialStructure ?storey.
      [] ifc:relatedObjects_IfcRelAggregates ?storey.
      ?storey a ifc:IfcBuildingStorey;
              ifc:name_IfcRoot/express:hasString ?name.
      ?related ifc:relatedObjects_IfcRelAggregates ?space.
      ?space a ifc:IfcSpace;
             ifc:longName_IfcSpatialElement/express:hasString ?value.
      filter(regex(str(?value), "BVO", 'i'))
      {
        ?Property a ifc:IfcRelDefinesByProperties;
                  ifc:relatedObjects_IfcRelDefinesByProperties ?space;
                  ifc:relatingPropertyDefinition_IfcRelDefinesByProperties ?set.
        ?set a ifc:IfcPropertySet;
             ifc:hasProperties_IfcPropertySet ?single.
        ?single ifc:nominalValue_IfcPropertySingleValue/express:hasString ?func.
        # filter(?func!="01")
        filter(regex(str(?func), "functie", 'i'))
      }
    }
    }
  }
  bind((xsd:decimal(concat(substr(str(?totalK / ?totalW), 1, strlen(strbefore(str(?totalK / ?totalW), ".")) + 3)))) as ?result)
  bind(IF(?result < 30, true, false) AS ?success)
  }

  `
  }

  bericht(): string {
    return `Bedrijfsfunctie is {?result}%.`
  }
}
