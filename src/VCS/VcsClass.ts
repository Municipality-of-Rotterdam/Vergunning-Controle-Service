/* eslint-disable no-console */
import dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { DSOAPI } from "./DSOAPI.js";
import { IFCTransform } from "./IFCTransform.js";
import { checkAPIKey, executeCommand, parsePolygonString } from "./helperFunctions.js";
import { RuimtelijkePlannenAPI } from "./RuimtelijkePlannenAPI.js";

// TODO add documentation/tool/community links for each tool + code library

dotenv.config();

// TODO replace every __dirname for relative path
export const __dirname = path.resolve();

// FOR CI
// TODO need a pyhton + nodeJS + java image

// FOR ETL
// TODO need time logging per request
// TODO should have original applied rule (juridische regel) text element included
// TODO fix API ruimtelijke plannen

// welstand bron data ophalen, nog niet regels/use cases aanpakken

/**
 * # Vergunnings Controle Service (VCS)
 *
 * ## Information and background
 * For DSO APIs documentation please see: https://aandeslagmetdeomgevingswet.nl/ontwikkelaarsportaal/api-register/
 * For more examples and UI overview see: https://developer.overheid.nl/apis
 *
 * Redocly can be used for any OpenAPI JSON spec, so if developer.overheid.nl does not provide an overiew you can use: https://redocly.github.io/redoc/
 * and load the OpenAPI JSON specification here (as is done for the Ruimtelijke Plannen API)
 *
 * NOTE: The DSO API is subject to change, since it currently does not contain any IMOW data (local municipality rules used for VCS) for Rotterdam, but will in the future.
 *       For now 95% of the data is present in the Ruimtelijke Plannen Opvragen API
 *       For Rotterdam, the DSO's Pre-Production environment contains a lot of mock data in addition to the IMOW data from het Rijk, but the pre production is incomplete and data is subject to change.
 *
 * For IMOW waardelijsten see: https://stelselcatalogus.omgevingswet.overheid.nl/waardelijsten/overview
 *
 *
 * ## Class description
 * This class provides some of the API functionalities of the DSO environment and related APIs to
 * retrieve rule data given a geo location, and generates a SHACL Constraint file, based on the relevant rules which will be used.
 *
 * The DSO & Ruimtelijke Plannen APIs work either with a GET or POST request, this can vary depending on the type of request (you can find this information in the respective OpenAPI JSON/YAML specification for each endpoint of the APIs)
 *
 * ## Data Transformation
 * In this class different transformation scripts are used, mainly Python scripts using IfcOpenShells Python library (no NPM library is available), and a java jar executable to transform the source IFC file into IFC-OWL RDF data.
 *
 */
export default class VCS {
    private apiUrl: string | undefined;
    private key: string | undefined;
    private ifcFilePath: string;
  
    constructor(ifcFilePath: string) {
      this.ifcFilePath = ifcFilePath;
    }
  
    IFC = {
      transform: () => new IFCTransform(this.ifcFilePath),
      validateWithIds: async (idsFilePath: string | string[], ifcFilePath: string = this.ifcFilePath): Promise<void> => {
        const pythonScriptPath = path.join(__dirname, "python", "validate_IFC.py");
        const requirements = path.join(__dirname, "python", "requirements.txt");
        const dataDir = path.join(__dirname, "data");
    
        //Check if data directory exists
        if (!fs.existsSync(dataDir)) {
          await fs.promises.mkdir(dataDir);
        }
        if (typeof idsFilePath == "string") {
          idsFilePath = [idsFilePath];
        }

        for (let index = 0; index < idsFilePath.length; index++) {
          const ids = idsFilePath[index];
          const htmlReportDestinationPath = path.join(
            dataDir,
            `IDSValidationReport${idsFilePath.length == 1 ? "" : `${index + 1}`}.html`
          );

          const bcfReportDestinationPath = path.join(
            dataDir,
            `IDSValidationReport${idsFilePath.length == 1 ? "" : `${index + 1}`}.bcf`
          );

          await executeCommand(`pip install -r ${requirements} --quiet`);
          try {
            await executeCommand(
              `python3 ${pythonScriptPath} "${ifcFilePath}" "${ids}" -r "${htmlReportDestinationPath}" -b "${bcfReportDestinationPath}"`
            );
          } catch (error) {
            throw error
          }
        }
      }
    };
  
    API = {
      RuimtelijkePlannen: (): RuimtelijkePlannenAPI => {
        checkAPIKey("Ruitemlijke Plannen API");
        this.key = process.env.Ruimtelijke_plannen_aanvragen_API_TOKEN;
        this.apiUrl =
          "https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/";
        return new RuimtelijkePlannenAPI(this.apiUrl, this.key!);
      },
      DSOPresenteren: (environment: "Production" | "Pre-Production"): DSOAPI => {
        if (environment == "Production") {
          checkAPIKey("DSO Production API");
          this.key = process.env.DSO_Production_API_TOKEN;
          this.apiUrl =
            "https://service.omgevingswet.overheid.nl/publiek/omgevingsdocumenten/api/presenteren/v7/";
        } else {
          checkAPIKey("DSO Pre-Production API");
          this.key = process.env.DSO_PreProduction_API_TOKEN;
          this.apiUrl =
            "https://service.pre.omgevingswet.overheid.nl/publiek/omgevingsdocumenten/api/presenteren/v7/";
        }
        return new DSOAPI(this.apiUrl, this.key!);
      },
    };
}

/**
 * Order:
 * [DONE] 
 *  1. IFC file   
 *            -> validate with IDS
 *            -> transform to IFC OWL RDF
 *            -> get coordinates CSV
 *            -> get footprint CSV
 *            -> create GLTF file
 *
 * [DONE BUT NEEDS TO BE TESTED] 
 * 2. Triply ETL 
 *      -> do VCS class stuff from step 1 (vcsEtl)
 *      -> RDF with from CSV data and GLTF as asset
 *      -> Upload to TriplyDB
 *
 * 
 * 3. Generate SHACL rapport by querying the graph for the building's footprint
 *      -> query for buildings footprint to get rule identifiers for use case 2
 *      -> query for rule's omgevings waarde
 *      -> map identifier to get the relating SHACL constraint + give omgevingswaarde too
 *      -> generate SHACL constraint file
 *      -> validate IDS data
 *
 * omgevingsplannen
 * IMOW identificatie van juridische regels als IDENTIFIER
 * regeltekst wordt hieraan gekoppeld
 *
 * bestemmingsplannen
 * identificatie hiervan is nog een vraag
 */

// DEMO ETL Transformation

// const ifcFilePath = 'src/VCS/data/IDS_wooden-windows_IFC.ifc'
// const idsFilePathWrong = 'src/VCS/data/IDS_wooden-windows.ids'
// const idsFilePathCorrect1 = 'src/VCS/data/IDS_wooden-windows_correct1.ids'
// const idsFilePathCorrect2 = 'src/VCS/data/IDS_wooden-windows_correct2.ids'
// const idsArray = [idsFilePathCorrect1, idsFilePathCorrect2]
// const idsFilePath3 = '/Users/work/triply/vergunningscontroleservice/src/VCS/data/NL_BIM\ Basis\ ILS.ids'

// const vcs = new VCS('src/VCS/data/Kievitsweg_R23_MVP_IFC4.ifc');
// await vcs.IFC.transform().IFCtoGLTF()


// VCS IDS Validation
// await vcs.IFC.validateWithIds(idsFilePathWrong)
// await vcs.IFC.validateWithIds('src/VCS/data/IDS_Rotterdam_BIM.ids')
// const ifcTransform = vcs.IFC.transform()


// const ruimtelijkePlannen = vcs.API.RuimtelijkePlannen()
// const polygon: string = await fs.promises.readFile("data/footprint.txt", 'utf-8');
// const coordinates = parsePolygonString(polygon)

// for (const coordinate of coordinates){
//   const jsonObj = {
//       "_geo": {
//         "contains": {
//           "type": "Point",
//           "coordinates": coordinate
//         }
//       }
//   }
//   const r = await ruimtelijkePlannen.plannen(jsonObj)
//   console.log('🪵  | r:', r)
//   const plannen = r['_embedded']['plannen']
//   for (let index = 0; index < plannen.length; index++) {
//     const element = plannen[index];
  
//     console.log('🪵  | element:', element)
//   }
// }



// // VCS Transform IFC to RDF
// await ifcTransform.IFCtoIFCOWL("https://www.rotterdam.nl/vcs/graph/");
// await ifcTransform.extractWKTCoordinates();
// await ifcTransform.extractFootprint();
// await ifcTransform.IFCtoGLTF();

