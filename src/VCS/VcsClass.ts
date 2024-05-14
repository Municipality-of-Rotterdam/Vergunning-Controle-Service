/* eslint-disable no-console */
import dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { DSOAPI } from "./DSOAPI.js";
import { IFCTransform } from "./IFCTransform.js";
import { checkAPIKey, executeCommand } from "./helperFunctions.js";
import { RuimtelijkePlannenAPI } from "./RuimtelijkePlannenAPI.js";

// TODO add documentation/tool/community links for each tool + code library

dotenv.config();
export const __dirname = path.resolve();

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

/**
 * TODO create pipeline ETL
 * [x] check IFC file with IDS and IFC OpenShell tool - create rapport
 * [x] IFC to IFC-OWL
 * [x] IFC to GLTF (for visualization)
 * [x] IFC extract projection
 * [x] IFC extract WKT coordinates
 * [x] Fix functions in transformation tool
 * [ ] TRIPLYETL get query for given footprint geometry with SPARQL
 * [ ] generate VCS SHACL constraints from footprint
 * [ ] perform validation on IFC-OWL data
 * [ ] upload rapport
 *
 */

export default class VCS {
    private apiUrl: string | undefined;
    private key: string | undefined;
    private ifcFilePath: string;
  
    constructor(ifcFilePath: string) {
      this.ifcFilePath = ifcFilePath;
    }
  
    IFC : {
      transform: () => IFCTransform,
      validateWithIds: (idsFilePath: string | string[], ifcFilePath?: string) => Promise<void>
    } = {
      transform: () => new IFCTransform(this.ifcFilePath),
      validateWithIds: async (idsFilePath: string | string[], ifcFilePath: string = this.ifcFilePath): Promise<void> => {
        const pythonScriptPath = path.join(__dirname, "python", "validate_IFC.py");
        const requirements = path.join(__dirname, "python", "requirements.txt");
        const dataDir = path.join(__dirname, "data");
    
        //Check if data directory exists
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir);
        }
        if (typeof idsFilePath == "string") {
          idsFilePath = [idsFilePath];
        }
        for (let index = 0; index < idsFilePath.length; index++) {
          const ids = idsFilePath[index];
          const reportDestinationPath = path.join(
            dataDir,
            `IDSValidationReport${idsFilePath.length == 1 ? "" : `${index + 1}`}.html`
          );
          await executeCommand(`pip install -r ${requirements} --quiet`);
          await executeCommand(
            `python3 ${pythonScriptPath} "${ifcFilePath}" "${ids}" -r "${reportDestinationPath}"`
          );
        }
      }
    };
  
    API: {
      RuimtelijkePlannen: () => RuimtelijkePlannenAPI;
      DSOPresenteren: (environment: "Production" | "Pre-Production") => DSOAPI;
    } = {
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
const vcs = new VCS('src/VCS/data/Kievitsweg_R23_MVP_IFC4.ifc');

// VCS IDS Validation
// await vcs.IFC.validateWithIds(idsFilePathWrong)
await vcs.IFC.validateWithIds('src/VCS/data/IDS_Rotterdam_BIM.ids')
const ifcTransform = vcs.IFC.transform()

// VCS Transform IFC to RDF
await ifcTransform.IFCtoIFCOWL("https://www.rotterdam.nl/vcs/graph/");
await ifcTransform.extractWKTCoordinates();
await ifcTransform.extractFootprint();
await ifcTransform.IFCtoGLTF();

