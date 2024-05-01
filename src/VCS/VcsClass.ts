/**
 * # Vergunnings Controle Service (VCS)
 * 
 * ## Information and background
 * For DSO API documentation please see: https://aandeslagmetdeomgevingswet.nl/ontwikkelaarsportaal/api-register/ 
 * For more examples and UI overview see: https://developer.overheid.nl/apis
 * 
 * For Ruitemlijke Plannen API see (can be outdated): https://redocly.github.io/redoc/?url=https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/
 * 
 * Redocly can be used for any OpenAPI JSON spec, so if developer.overheid.nl does not provide it use: https://redocly.github.io/redoc/
 * 
 * NOTE: The DSO API is subject to change, since it currently does not contain any IMOW data (local municipality rules used for VCS), but will in the future.
 *       For now we are in discussion with IPLO to find the best method to retrieve this IMOW data.
 *
 * For IMOW waardelijsten see: https://stelselcatalogus.omgevingswet.overheid.nl/waardelijsten/overview
 * 
 * 
 * ## Class description
 * This class provides some of the API functionalities of the DSO environment and related APIs to
 * retrieve rule data given a geo location, and generates a SHACL Constraint file, based on the relevant rules which will be used.
 *
 * The DSO APIs work either with a GET or POST request, this can vary depending on the type of request (you can find this information in the OpenAPI JSON specification for each endpoint of the DSO APIs)
 * 
 * ### Example: Omgevingsdocumenten toepasbaaropvragen API
 * 
 * Omgevingsdocumenten toepasbaaropvragen API is one of the APIs from the DSO
 * To find an activity given a particular GeoJSON Point, we send a POST request with the required headers, and required GeoJSON body, to https://service.omgevingswet.overheid.nl/publiek/omgevingsdocumenten/api/toepasbaaropvragen/v7/activiteitidentificaties/_zoek and get back a list of activity IDs relevant for this location.
 * Then for each activity do a GET request with the required headers to https://service.omgevingswet.overheid.nl/publiek/omgevingsdocumenten/api/toepasbaaropvragen/v7/activiteiten/{activityID}/regelteksten, which will return the regelteksten (rule text) for this activity
 */

/**
 * TODOs VCS API Class afmaken
 *
 * [ ] Ruimtelijke plannen opvragen
 *      [ ] PDF lezen
 *      [ ] GET request uitsturen - waarvoor kan dit worden gebruikt?
 *
 * `
 * TODO SHACL Rule FOR KIEVIETSWEG:
 *
 * TODO Mapping between the rules from the API and rules that we have.
 */
import dotenv from "dotenv";
dotenv.config();
type GeoJSONPolygon = {
    spatialOperator: string;
    geometrie: {
        type: 'Polygon';
        coordinates: number[][][];
    };
}
type GeoJSONPoint = {
    spatialOperator: string;
    geometrie: {
        type: 'Point';
        coordinates: number[];
    };
}
type Geometry = GeoJSONPoint | GeoJSONPolygon
class VCS {
  private readonly omgevingsDocumentenToepasbaarOpvragenAPI =
    "https://service.omgevingswet.overheid.nl/publiek/omgevingsdocumenten/api/toepasbaaropvragen/v7";
  private readonly DSO_ODTO_API_KEY = process.env.DSO_ODTO_API_KEY;
  // private readonly ruitmelijkePlannenOpvragenAPI = ''
  // private readonly DSO_RPO_API_KEY = process.env.DSO_RPO_API_KEY
  constructor() {}

  public async getRuleActivity(geometry: Geometry): Promise<any> {
    if (this.DSO_ODTO_API_KEY == (undefined || ""))
      throw new Error(
        "No DSO Omgevings Document Toepasbaar Opvragen API key given"
      );
    const url = `${this.omgevingsDocumentenToepasbaarOpvragenAPI}/activiteitidentificaties/_zoek`;
    const headers = new Headers();
    headers.append("x-api-key", this.DSO_ODTO_API_KEY!);
    headers.append("content-Crs", "EPSG:28992");
    headers.append("Content-Type", "application/json");

    const requestOptions: RequestInit = {
      method: "POST",
      headers,
      body: JSON.stringify(geometry),
    };
    const response = await fetch(url, requestOptions);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `POST request failed to retrieve rule activity: ${response.status} ${response.statusText}\n${data.title ? data.title + " :" : ""} ${data.detail ? data.detail : ""}\nGiven URL: ${url}\nGiven geometry:\n${geometry}`
      );
    }

    return data;
  }

  public async getRuleText(articleID: string): Promise<any> {
    const url = `${this.omgevingsDocumentenToepasbaarOpvragenAPI}/activiteiten/${articleID}/regelteksten`;
    
    const headers = new Headers();
    headers.append("x-api-key", `${this.DSO_ODTO_API_KEY}`)
    headers.append("Content-Type", "application/json")

    const response = await fetch(url, {
      method: "GET",
      headers,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`GET request failed to retrieve rule text: ${response.status} ${response.statusText}\n${data.title ? data.title + " :" : ""} ${data.detail ? data.detail : ""}\nGiven URL: ${url}`);
    }

    return data;
  }
  public async createSHACLConstraint(
    dictionary: { [key: string]: string },
    geometry: Geometry
  ): Promise<string> {
    // Initialize the output string for SHACL Constraint
    let shaclConstraint =`
    # External prefix declarations
    prefix dbo:   <http://dbpedia.org/ontology/>
    prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
    prefix sh:    <http://www.w3.org/ns/shacl#>
    prefix xsd:   <http://www.w3.org/2001/XMLSchema#>
    
    # Project-specific prefix
    prefix def:   <https://demo.triplydb.com/rotterdam/vcs/model/def/>
    prefix graph: <https://demo.triplydb.com/rotterdam/vcs/graph/>
    prefix shp:   <https://demo.triplydb.com/rotterdam/vcs/model/shp/>
    
    `;

    const rules = await this.getRuleActivity(geometry);

    // Iterate through each rule
    for (const articleID of rules) {
      const rule = await this.getRuleText(articleID);
      // Parse the rule JSON string to get "wId" key
      const regelteksten = rule['_embedded']['regelteksten']
      for (const regeltekst of regelteksten){
          const { omschrijving }: { omschrijving: string } = regeltekst
          const { wId }: { wId: string } = regeltekst;
          console.log(`wId:\t${wId}\nomschrijving:\n${omschrijving}\n\n`)
          // Check if the "wId" exists in the dictionary
          if (dictionary[wId]) {
          shaclConstraint += dictionary[wId];
          }
      }
    }

    // Return the RDF string of the SHACL Constraint
    return shaclConstraint;
  }
}

//  const exampleGeometry = `{
//         "geometrie": {
//           "type": "Point",
//             "coordinates": [
//                 139784,
//                 442870
//             ]
//         },
//         "spatialOperator": "intersects"

//     }
// `

const vcs = new VCS();

// const geo: GeoJSONPolygon = {
//     spatialOperator: "intersects",
//     geometrie: {
//       type: "Polygon",
//       coordinates: [
//         [
//           [105211.769, 450787.213],
//           [105209.649, 450790.086],
//           [105209.022, 450791.197],
//           [105206.259, 450742.392],
//           [105203.498, 450693.593],
//           [105204.811, 450691.548],
//           [105206.225, 450689.396],
//           [105207.546, 450710.383],
//           [105211.769, 450787.213],
//         ],
//       ],
//     },
//   };
const geo1: GeoJSONPoint = {
    spatialOperator: "intersects",
    geometrie: {
      type: "Point",
      coordinates: [84207, 431716]
    },
  };

  const retrievedNumberPositiveMaxBouwlagen = 2
// Generate a fake dictionary object
const maxBouwlaagRule = `
shp:BuildingMaxAantalPositieveBouwlagenSparql
  a sh:SPARQLConstraint;
  sh:message 'Gebouw {?this} heeft {?aantalBouwlagen}, dit moet ${retrievedNumberPositiveMaxBouwlagen} zijn.';
  sh:severity sh:Violation;
  sh:datatype xsd:string;
  sh:select '''
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX ifc: <http://standards.buildingsmart.org/IFC/DEV/IFC4_3/RC1/OWL#>
  PREFIX express: <https://w3id.org/express#>
  
  SELECT 
    (COUNT(?positiveFloorLabel) AS ?numPositiveFloors)
  WHERE {
    {
      SELECT ?positiveFloorLabel WHERE {
        ?storey a ifc:IfcBuildingStorey;
                ifc:name_IfcRoot ?storeyLabel.
        ?storeyLabel a ifc:IfcLabel;
                     express:hasString ?positiveFloorLabel.
        FILTER(REGEX(?positiveFloorLabel, "^(0?[1-9]|[1-9][0-9]) .*")) # Matches positive floors starting from '01'
        FILTER(?positiveFloorLabel != "00 begane grond") # Excludes '00 begane grond'
      }
    }
  }
  FILTER(numPositiveFloors? > ${retrievedNumberPositiveMaxBouwlagen})
  '''.
`
const fakeDictionary = {
    "exampleWId1": maxBouwlaagRule,
    "exampleWId2": "Example SHACL Rule 2",
    // Add more fake dictionary entries as needed
};

vcs.createSHACLConstraint(fakeDictionary, geo1).then(res => {console.log(res)}).catch(e => {throw e})
