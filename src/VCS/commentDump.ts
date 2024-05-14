
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



// async function createSHACLConstraint(
//     dictionary: { [key: string]: string },
//     geometry: Geometry
//   ): Promise<string> {
//     // Initialize the output string for SHACL Constraint
//     let shaclConstraint =`
//     # External prefix declarations
//     prefix dbo:   <http://dbpedia.org/ontology/>
//     prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
//     prefix sh:    <http://www.w3.org/ns/shacl#>
//     prefix xsd:   <http://www.w3.org/2001/XMLSchema#>

//     # Project-specific prefix
//     prefix def:   <https://demo.triplydb.com/rotterdam/vcs/model/def/>
//     prefix graph: <https://demo.triplydb.com/rotterdam/vcs/graph/>
//     prefix shp:   <https://demo.triplydb.com/rotterdam/vcs/model/shp/>

//     `;

//     // TODO get the specific rules for given geometry
//     // TODO get specific omgevingswaarde to fill in for rule
//     const rules = await this.getRuleActivity(geometry);

//     // Iterate through each rule
//     for (const articleID of rules) {
//       const rule = await this.getRuleText(articleID);
//       // Parse the rule JSON string to get "wId" key
//       const regelteksten = rule['_embedded']['regelteksten']
//       for (const regeltekst of regelteksten){
//           const { omschrijving }: { omschrijving: string } = regeltekst
//           const { wId }: { wId: string } = regeltekst;
//           console.log(`wId:\t${wId}\nomschrijving:\n${omschrijving}\n\n`)
//           // Check if the "wId" exists in the dictionary
//           if (dictionary[wId]) {
//           shaclConstraint += dictionary[wId];
//           }
//       }
//     }

//     // Return the RDF string of the SHACL Constraint
//     return shaclConstraint;
//   }

// const vcs = new VCS();

// const geo1: GeoJSONPoint = {
//     spatialOperator: "intersects",
//     geometrie: {
//       type: "Point",
//       coordinates: [84207, 431716]
//     },
//   };

//   const retrievedNumberPositiveMaxBouwlagen = 2
// // Generate a fake dictionary object
// const maxBouwlaagRule = `
// shp:BuildingMaxAantalPositieveBouwlagenSparql
//   a sh:SPARQLConstraint;
//   sh:message 'Gebouw {?this} heeft {?aantalBouwlagen}, dit moet ${retrievedNumberPositiveMaxBouwlagen} zijn.';
//   sh:severity sh:Violation;
//   sh:datatype xsd:string;
//   sh:select '''
//   PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
//   PREFIX ifc: <http://standards.buildingsmart.org/IFC/DEV/IFC4_3/RC1/OWL#>
//   PREFIX express: <https://w3id.org/express#>

//   SELECT
//     (COUNT(?positiveFloorLabel) + COUNT(?negativeFloorLabel) AS ?totalNumberOfFloors)
//   WHERE {
//     {
//       SELECT ?positiveFloorLabel WHERE {
//         ?storey a ifc:IfcBuildingStorey;
//                 ifc:name_IfcRoot ?storeyLabel.
//         ?storeyLabel a ifc:IfcLabel;
//                      express:hasString ?positiveFloorLabel.
//         FILTER(REGEX(?positiveFloorLabel, "^(0?[1-9]|[1-9][0-9]) .*")) # Matches positive floors starting from '01'
//         FILTER(?positiveFloorLabel != "00 begane grond") # Excludes '00 begane grond'
//       }
//     }
//     UNION
//     {
//       SELECT ?negativeFloorLabel WHERE {
//         ?storey a ifc:IfcBuildingStorey;
//                 ifc:name_IfcRoot ?storeyLabel.
//         ?storeyLabel a ifc:IfcLabel;
//                      express:hasString ?negativeFloorLabel.
//         FILTER(REGEX(?negativeFloorLabel, "^-(0?[1-9]|[1-9][0-9]) .*")) # Matches negative floors starting from '-01'
//       }
//     }
//   }
//   FILTER(numPositiveFloors? > ${retrievedNumberPositiveMaxBouwlagen})
//   '''.
// `
// const fakeDictionary = {
//     "exampleWId1": maxBouwlaagRule,
//     "exampleWId2": "Example SHACL Rule 2",
//     // Add more fake dictionary entries as needed
// };

// vcs.createSHACLConstraint(fakeDictionary, geo1).then(res => {console.log(res)}).catch(e => {throw e})


// // type GeoJSONPolygon = {
// //   spatialOperator: string;
// //   geometrie: {
// //     type: "Polygon";
// //     coordinates: number[][][];
// //   };
// // };
// // type GeoJSONPoint = {
// //   spatialOperator: string;
// //   geometrie: {
// //     type: "Point";
// //     coordinates: number[];
// //   };
// // };
// // type Geometry = GeoJSONPoint | GeoJSONPolygon;
