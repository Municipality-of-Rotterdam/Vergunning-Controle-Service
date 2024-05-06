import dotenv from "dotenv";
import os from "os";
import { $ } from "execa";
import * as fsp from "fs/promises";
import * as fs from "fs-extra";
import * as https from "https";
import * as AdmZip from "adm-zip";
import * as path from "path";
import * as gltf from "gltf-pipeline";

dotenv.config();

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
 */

/**
 * TODO create pipeline ETL
 * [x] check IFC file with IDS and IFC OpenShell tool - create rapport
 * [x] IFC to IFC-OWL
 * [x] IFC to GLTF (for visualization)
 * [ ] IFC extract projection
 * [ ] IFC extract WKT coordinates
 * [ ] query for given geometry with SPARQL and generate VCS SHACL constraints
 * [ ] perform validation on IFC-OWL data
 * [ ] upload rapport
 */
function getCurrentDate(format: "US" | "EU" = "US"): string {
  const currentDate = new Date();
  let formattedDate: string;

  if (format === "US") {
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const day = currentDate.getDate().toString().padStart(2, "0");
    formattedDate = `${year}-${month}-${day}`;
  } else {
    const day = currentDate.getDate().toString().padStart(2, "0");
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const year = currentDate.getFullYear();
    formattedDate = `${day}-${month}-${year}`;
  }

  return formattedDate;
}

async function getRequest(url: string, headers: Headers): Promise<any> {
  const requestOptions: RequestInit = {
    method: "GET",
    headers,
  };
  return fetch(url, requestOptions);
}

async function postRequest(
  url: string,
  headers: Headers,
  body: BodyInit
): Promise<any> {
  const requestOptions: RequestInit = {
    method: "POST",
    headers,
    body,
  };
  return fetch(url, requestOptions);
}

function checkAPIKey(
  typeAPI:
    | "DSO Production API"
    | "DSO Pre-Production API"
    | "Ruitemlijke Plannen API"
) {
  if (typeAPI == "DSO Production API") {
    if (!process.env.DSO_Production_API_TOKEN)
      throw new Error(
        'DSO Production API is used but no API key was specified, for local development please create an `.env` file and add the API key as variable: "DSO_Production_API_TOKEN"'
      );
  }
  if (typeAPI == "DSO Pre-Production API") {
    if (!process.env.DSO_PreProduction_API_TOKEN)
      throw new Error(
        'DSO Pre-Production API is used but no API key was specified, for local development please create an `.env` file and add the API key as variable: "DSO_PreProduction_API_TOKEN"'
      );
  }
  if (typeAPI == "Ruitemlijke Plannen API") {
    if (!process.env.Ruimtelijke_plannen_aanvragen_API_TOKEN)
      throw new Error(
        'Ruimtelijke Plannen API is used but no API key was specified, for local development please create an `.env` file and add the API key as variable: "Ruimtelijke_plannen_aanvragen_API_TOKEN"'
      );
  } else {
    throw new Error(
      `Specified API type '${typeAPI}' is not supported. Please use: DSO Production API, DSO Pre-Production API, Ruitemlijke Plannen API`
    );
  }
}

type GeoJSONPolygon = {
  spatialOperator: string;
  geometrie: {
    type: "Polygon";
    coordinates: number[][][];
  };
};
type GeoJSONPoint = {
  spatialOperator: string;
  geometrie: {
    type: "Point";
    coordinates: number[];
  };
};
type Geometry = GeoJSONPoint | GeoJSONPolygon;
class IFCTransform {
  private ifcFilePath: string | undefined;
  constructor(ifcFilePath: string) {
    // TODO check if ifc file exists
    this.ifcFilePath = ifcFilePath;

    // check if python is installed
    async () => {
      try {
        // Check if Python is installed
        await $`python3 --version`;
      } catch (error) {
        throw new Error(
          "Python 3 does not seem to be installed, please install python according to the steps in the README.md document."
        );
      }
    };
  }
  private getOperatingSystem(): string {
    const platform = os.platform();
    const arch = os.arch();

    switch (platform) {
      case "darwin":
        if (arch === "arm64" && os.platform() === "darwin") {
          return "MacOS M1 64bit";
        } else {
          return "MacOS 64bit";
        }
      case "win32":
        if (arch === "x64") {
          return "Windows 64bit";
        } else {
          return "Windows 32bit";
        }
      case "linux":
        if (arch === "x64") {
          return "Linux 64bit";
        }
      default:
        throw new Error(
          `Operating System not recognized! Got platform: ${platform}, with architecture: ${arch}`
        );
    }
  }

  private async downloadAndUnzip(
    url: string,
    targetDir: string = "tools"
  ): Promise<void> {
    // Create ./tools directory if it doesn't exist
    const toolsDir = path.join(__dirname, targetDir);
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir);
    }

    // Download the file
    const response = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        throw new Error(`Failed to download file: ${res.statusCode}`);
      }
    });

    const filePath = `${toolsDir}/IfcConvert`;
    // Create a writable stream for the file
    const writableStream = fs.createWriteStream(filePath);
    response.pipe(writableStream);

    // Unzip the downloaded file
    const zip = new AdmZip.default(filePath);
    zip.extractAllToAsync(toolsDir, true); // true to overwrite existing files

    // Remove the downloaded zip file
    // await fsp.unlink(filePath);

    console.log(`Downloaded IfcConvert to ${toolsDir}`);
  }

  /**
   * TODO test this
   * @param inputFilePath input file path of IFC file
   * @param outputFilePath output file path of IFC-OWL file
   * @param baseURI base URI used in RDF file
   *
   * WANRING: We use https://github.com/pipauwel/IFCtoRDF - but this repository is archived and no longer updated
   * If there is a preference for LBD ontology, the https://github.com/jyrkioraskari/IFCtoLBD tool should be used instead (this repository is actively maintained)
   *
   * Note the usage if IFCtoRDF is memory intensive!
   */
  async toIFCOWL(
    inputFilePath: string = this.ifcFilePath!,
    outputFilePath: string = path.join(__dirname, "data", "ifcOwlData.ttl"),
    baseURI: string
  ) {
    const toolsDir = path.join(__dirname, "tools");
    const dataDir = path.join(__dirname, "data");
    const url =
      "https://github.com/pipauwel/IFCtoRDF/releases/download/IFCtoRDF-0.4/IFCtoRDF-0.4-shaded.jar";
    const fileName = url.split("/").pop();
    const filePath = path.join(toolsDir, fileName!);
    // Check if tools directory exists
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir);
    }
    //Check if data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    // Check if Java is installed
    try {
      const { stdout } = await $`java --version`;
      if (!stdout.startsWith("java version")) {
        throw new Error(
          `Java is not installed. Please install Java and try again.\n${stdout}`
        );
      }
    } catch (error) {
      throw new Error(`Error checking Java installation:\n${error}`);
    }
    // Check if Java jar is present in tool directory
    if (!fs.existsSync(filePath)) {
      console.log(
        "Java tool not present in tools directory, downloading tool..."
      );
      try {
        const response = https.get(url, (res) => {
          if (res.statusCode !== 200) {
            throw new Error(`Failed to download file: ${res.statusCode}`);
          }
        });

        const fileStream = fs.createWriteStream(filePath);
        response.pipe(fileStream);

        console.log(`Downloaded IFCtoRDF jar to ${filePath}`);
      } catch (error) {
        throw new Error(`Error downloading jar: ${error}`);
      }
    }
    // Running script
    try {
      await $`java -jar ${filePath} --baseURI ${baseURI} --dir ${outputFilePath}`;
    } catch (error) {
      console.error("Error running Java command:", error);
    }
  }

  // TODO test this
  async toGLTF() {
    // Manual page: https://docs.ifcopenshell.org/ifcconvert/usage.html
    const toolsDir = path.join(__dirname, "tools");
    const ifcConverterPath = path.join(toolsDir, "IfcConvert");
    // Transform IFC to GLB
    try {
      // Check if the package is installed
      if (!fs.existsSync(ifcConverterPath))
        throw new Error("IfcConverter not installed!");
    } catch (error) {
      // If package is not installed, install it
      console.log("Installing IfcConverter...");
      const operatingSystem = this.getOperatingSystem();
      let downloadUrl: string;
      switch (operatingSystem) {
        case "MacOS M1 64bit":
          downloadUrl =
            "https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-f7c03db-macosm164.zip";
          await this.downloadAndUnzip(downloadUrl);
          return;
        case "MacOS 64bit":
          downloadUrl =
            "https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-f7c03db-macos64.zip";
          await this.downloadAndUnzip(downloadUrl);
          return;
        case "Windows 64bit":
          downloadUrl =
            "https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-f7c03db-win64.zip";
          await this.downloadAndUnzip(downloadUrl);
          return;
        case "Windows 32bit":
          downloadUrl =
            "https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-f7c03db-win32.zip";
          await this.downloadAndUnzip(downloadUrl);
          return;
        case "Linux 64bit":
          downloadUrl =
            "https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-f7c03db-linux64.zip";
          await this.downloadAndUnzip(downloadUrl);
          return;
        default:
          break;
      }
    }
    // Run IfcConverter tool to create GLB data from IFC data
    const dataDir = path.join(__dirname, "data");
    const glbFilePath = path.join(dataDir, "ouput.glb");
    const gltfFilePath = path.join(dataDir, "ouput.gltf");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    // Run IfcConvert script
    try {
      await $`${ifcConverterPath} ${this.ifcFilePath!} ${glbFilePath}`;
    } catch (error) {
      throw error;
    }

    // Transform GLB to GLTF
    if (!fs.existsSync(glbFilePath)) {
      throw new Error("GLB file was not created!");
    }
    const glb = fs.readFileSync(glbFilePath);
    gltf.glbToGltf(glb).then(function (results: any) {
      fs.writeJsonSync(gltfFilePath, results.gltf);
    });
    console.log(`GLTF file was created at ${gltfFilePath}`);

    // Remove GLB file
    await fsp.unlink(glbFilePath);
  }

  async extractProjection() {
    // [ ] have python script with requirements.txt for lib
    const pythonScript = "";
    const requirements = "";
    try {
      // TODO Python script should take in IFC file and output an RDF file?
      await $`pip install -r ${requirements}`;
      await $`pyhton3 ${pythonScript}`;
    } catch (error) {
      throw error;
    }
  }

  async extractWKT() {
    // [ ] have python script with requirements.txt for lib
    const pythonScript = "";
    const requirements = "";
    try {
      // TODO Python script should take in IFC file and output an RDF file?
      await $`pip install -r ${requirements}`;
      await $`pyhton3 ${pythonScript}`;
    } catch (error) {
      throw error;
    }
  }
}
class VCS {
  private apiUrl: string | undefined;
  private key: string | undefined;
  constructor() {}

  DSO(environment: "Production" | "Pre-Production"): DSOAPI {
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
  }

  RuimtelijkePlannen(): RuimtelijkePlannenAPI {
    checkAPIKey("Ruitemlijke Plannen API");
    this.key = process.env.Ruimtelijke_plannen_aanvragen_API_TOKEN;
    this.apiUrl =
      "https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/";
    return new RuimtelijkePlannenAPI(this.apiUrl, this.key!);
  }
  async IFC_IDS_Validator(ifcFilePath: string, idsFilePath: string) {
    const dataDir = path.join(__dirname, "data");
    const destinationPath = path.join(dataDir, "IDSValidationReport.html");
    //Check if data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    try {
      await $`pip install -r ifctester`;
      await $`pyhton3 -m ifctester ${idsFilePath} ${ifcFilePath} -r Html -o ${destinationPath}`;
    } catch (error) {
      throw error;
    }
    // TODO read file and check if rapport is correct or invalid
    console.log(
      `Validation completed! Please see the validation report: ${destinationPath}`
    );
  }
}
/**
      All paths for DSO presenteren API:
      "/activiteiten"
      "/activiteiten/_zoek"
      "/activiteiten/{identificatie}"
      "/activiteiten/{identificatie}/activiteitlocatieaanduidingen"
      "/activiteiten/{identificatie}/activiteitlocatieaanduidingen/{activiteitlocatieaanduidingidentificatie}"
      "/activiteitlocatieaanduidingen/_zoek"
      "/afbeeldingen/{bevoegdGezag}/{toestandIdentificatie}/{naam}"
      "/app-info"
      "/divisieannotaties"
      "/divisieannotaties/_zoek"
      "/divisieannotaties/{identificatie}"
      "/gebiedsaanwijzingen"
      "/gebiedsaanwijzingen/_zoek"
      "/gebiedsaanwijzingen/{identificatie}"
      "/health"
      "/hoofdlijnen"
      "/hoofdlijnen/_zoek"
      "/hoofdlijnen/{identificatie}"
      "/hoofdlijnen/{identificatie}/gerelateerd"
      "/kaarten"
      "/kaarten/_zoek"
      "/kaarten/{identificatie}"
      "/locatieidentificaties/_zoek"
      "/locatieidentificaties/toekomstig/_zoek"
      "/locaties"
      "/locaties/_zoek"
      "/locaties/{identificatie}"
      "/locaties/{identificatie}/bounding-box"
      "/omgevingsnormen"
      // TODO this should contain values for laws
      "/omgevingsnormen/_zoek"
      "/omgevingsnormen/{identificatie}"
      "/omgevingsnormen/{identificatie}/normwaarden/{normwaardeIdentificatie}"
      "/omgevingsvergunningen"
      "/omgevingsvergunningen/_suggesties"
      "/omgevingsvergunningen/_zoek"
      "/omgevingsvergunningen/{identificatie}"
      "/omgevingswaarden"
      // TODO this should contain values for laws
      "/omgevingswaarden/_zoek"
      "/omgevingswaarden/{identificatie}"
      "/omgevingswaarden/{identificatie}/normwaarden/{normwaardeIdentificatie}"
      "/ontwerpactiviteiten"
      "/ontwerpactiviteiten/_zoek"
      "/ontwerpactiviteiten/{ontwerpActiviteitTechnischId}/ontwerpactiviteitlocatieaanduidingen"
      "/ontwerpactiviteiten/{ontwerpActiviteitTechnischId}/ontwerpactiviteitlocatieaanduidingen/{activiteitlocatieaanduidingidentificatie}"
      "/ontwerpactiviteiten/{technischId}"
      "/ontwerpactiviteitlocatieaanduidingen/_zoek"
      "/ontwerpafbeeldingen/{bevoegdGezag}/{ontwerpbesluitIdentificatie}/{naam}"
      "/ontwerpdivisieannotaties"
      "/ontwerpdivisieannotaties/_zoek"
      "/ontwerpdivisieannotaties/{technischId}"
      "/ontwerpgebiedsaanwijzingen"
      "/ontwerpgebiedsaanwijzingen/_zoek"
      "/ontwerpgebiedsaanwijzingen/{technischId}"
      "/ontwerphoofdlijnen"
      "/ontwerphoofdlijnen/_zoek"
      "/ontwerphoofdlijnen/{technischId}"
      "/ontwerpkaarten"
      "/ontwerpkaarten/_zoek"
      "/ontwerpkaarten/{technischId}"
      "/ontwerplocaties"
      "/ontwerplocaties/_zoek"
      "/ontwerplocaties/technischids/_zoek"
      "/ontwerplocaties/{technischId}"
      "/ontwerplocaties/{technischId}/bounding-box"
      "/ontwerpomgevingsnormen"
      "/ontwerpomgevingsnormen/_zoek"
      "/ontwerpomgevingsnormen/{technischId}"
      "/ontwerpomgevingsnormen/{technischId}/normwaarden/{normwaardeIdentificatie}"
      "/ontwerpomgevingswaarden"
      "/ontwerpomgevingswaarden/_zoek"
      "/ontwerpomgevingswaarden/{technischId}"
      "/ontwerpomgevingswaarden/{technischId}/normwaarden/{normwaardeIdentificatie}"
      "/ontwerpponsen/_zoek"
      "/ontwerpponsen/{technischId}"
      "/ontwerpregelingen"
      "/ontwerpregelingen/_suggesties"
      "/ontwerpregelingen/findByExpressionId"
      "/ontwerpregelingen/regels/_zoek"
      "/ontwerpregelingen/tekstdelen/_zoek"
      "/ontwerpregelingen/{technischId}"
      "/ontwerpregelingen/{technischId}/ontwerpdocumentcomponenten"
      "/ontwerpregelingen/{technischId}/ontwerpdocumentcomponenten/{componentWorkId}"
      "/ontwerpregelingen/{technischId}/tekststructuur"
      "/ontwerpregelingen/{technischId}/themas"
      "/ontwerpregelteksten"
      "/ontwerpregelteksten/_zoek"
      "/ontwerpregelteksten/{technischId}"
      "/ponsen/_afgedekt-door"
      TODO check out ponsen
      "/ponsen/_zoek"
      "/ponsen/{identificatie}"
      "/regelingen"
      "/regelingen/_suggesties"
      "/regelingen/findById"
      // TODO add regelingen
      "/regelingen/regels/_zoek"
      "/regelingen/tekstdelen/_zoek"
      "/regelingen/voorkomens/_zoek"
      "/regelingen/{identificatie}"
      "/regelingen/{identificatie}/documentcomponenten"
      "/regelingen/{identificatie}/documentcomponenten/{componentWorkId}"
      "/regelingen/{identificatie}/tekststructuur"
      "/regelingen/{identificatie}/themas"
      "/regelingen/{identificatie}/voorkomens"
      "/regelteksten"
      // TODO add regelteksten
      ++ "/regelteksten/_zoek"
      "/regelteksten/{identificatie}"
    */
/**
 * Omgevingsdocument presenteren API
 * @description this API contains all data w.r.t. the DSO and should contain the bestemmingsplannen/omgevingswet data
 * @param geometry GeoJSON object, as specified by the specification.
 * @param method All methods available in the API, see paths in the Open API specification or visit the link
 * @link https://developer.overheid.nl/apis/dso-omgevingsdocument-presenteren, https://aandeslagmetdeomgevingswet.nl/ontwikkelaarsportaal/api-register/api/omgevingsdocument-presenteren/
 */
class DSOAPI {
  private key: string;
  private url: string;
  constructor(apiUrl: string, key: string) {
    this.key = key;
    this.url = apiUrl;
  }
  async omgevingsnormen(locatieIdentificatie: string) {
    const path = "omgevingsnormen/_zoek";
    const url =
      this.url +
      path +
      `?geldigOp=${getCurrentDate()}&inWerkingOp=${getCurrentDate()}`;
    const headers = new Headers();
    headers.append("x-api-key", this.key.toString());
    const body = JSON.stringify({
      zoekParameters: [
        {
          parameter: "locatie.identificatie",
          zoekWaarden: [locatieIdentificatie],
        },
      ],
    });

    const response = await postRequest(url, headers, body);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `POST request failed: ${response.status} ${response.statusText}\n${data}\nGiven URL: ${url}`
      );
    }

    return data;
  }

  async omgevingswaarden(locatieIdentificatie: string) {
    const path = "omgevingswaarden/_zoek";
    const url =
      this.url +
      path +
      `?geldigOp=${getCurrentDate()}&inWerkingOp=${getCurrentDate()}`;
    const headers = new Headers();
    headers.append("x-api-key", this.key.toString());
    const body = JSON.stringify({
      zoekParameters: [
        {
          parameter: "locatie.identificatie",
          zoekWaarden: [locatieIdentificatie],
        },
      ],
    });

    const response = await postRequest(url, headers, body);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `POST request failed: ${response.status} ${response.statusText}\n${data}\nGiven URL: ${url}`
      );
    }

    return data;
  }
  async regelingen(locatieIdentificatie: string) {
    const path = "regelingen/regels/_zoek";
    const url =
      this.url +
      path +
      `?geldigOp=${getCurrentDate()}&inWerkingOp=${getCurrentDate()}`;
    const headers = new Headers();
    headers.append("x-api-key", this.key.toString());
    const body = JSON.stringify({
      zoekParameters: [
        // {
        //   "parameter": "document.type",
        //   "zoekWaarden": [
        //     "/join/id/stop/regelingtype_001"
        //   ]
        // },
        {
          parameter: "locatie.identificatie",
          zoekWaarden: [locatieIdentificatie],
        },
      ],
    });

    const response = await postRequest(url, headers, body);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `POST request failed: ${response.status} ${response.statusText}\n${data}\nGiven URL: ${url}`
      );
    }

    return data;
  }
  async regelteksten(locatieIdentificatie: string) {
    const path = "omgevingswaarden/_zoek";
    const url =
      this.url +
      path +
      `?geldigOp=${getCurrentDate()}&inWerkingOp=${getCurrentDate()}`;
    const headers = new Headers();
    headers.append("x-api-key", this.key.toString());
    const body = JSON.stringify({
      zoekParameters: [
        // {
        //   "parameter": "gebiedsaanwijzing.identificatie",
        //   "zoekWaarden": [
        //     ""
        //   ]
        // },
        {
          parameter: "locatie.identificatie",
          zoekWaarden: [locatieIdentificatie],
        },
      ],
    });

    const response = await postRequest(url, headers, body);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `POST request failed: ${response.status} ${response.statusText}\n${data}\nGiven URL: ${url}`
      );
    }

    return data;
  }
}

/**
 * All Ruimtelijke Plannen Opvragen API paths:
- /plannen
TODO 1st requirement to get planID
- /plannen/_zoek
- /plannen/_suggesties
- /plannen/_plansuggesties
- /plannen/{planId}
- /plannen/{planId}/cartografiesummaries
- /plannen/{planId}/cartografiesummaries/{id}
TODO check out:
- /plannen/{planId}/teksten
- /plannen/{planId}/teksten/{id}
TODO check out:
- /plannen/{planId}/artikelen/_zoek
- /plannen/{planId}/bestemmingsvlakken
TODO check out:
- /plannen/{planId}/bestemmingsvlakken/_zoek
TODO check out:
- /plannen/{planId}/bestemmingsvlakken/{id}
- /plannen/{planId}/bouwvlakken
- /plannen/{planId}/bouwvlakken/_zoek
- /plannen/{planId}/bouwvlakken/{id}
- /plannen/{planId}/functieaanduidingen
- /plannen/{planId}/functieaanduidingen/_zoek
- /plannen/{planId}/functieaanduidingen/{id}
- /plannen/{planId}/bouwaanduidingen
- /plannen/{planId}/bouwaanduidingen/_zoek
- /plannen/{planId}/bouwaanduidingen/{id}
- /plannen/{planId}/lettertekenaanduidingen
- /plannen/{planId}/lettertekenaanduidingen/_zoek
- /plannen/{planId}/lettertekenaanduidingen/{id}
TODO check out:
- /plannen/{planId}/maatvoeringen
- /plannen/{planId}/maatvoeringen/_zoek
- /plannen/{planId}/maatvoeringen/{id}
- /plannen/{planId}/figuren
- /plannen/{planId}/figuren/_zoek
- /plannen/{planId}/figuren/{id}
TODO check out:
- /plannen/{planId}/gebiedsaanduidingen
- /plannen/{planId}/gebiedsaanduidingen/_zoek
- /plannen/{planId}/gebiedsaanduidingen/{id}
- /plannen/{planId}/structuurvisiegebieden
- /plannen/{planId}/structuurvisiegebieden/_zoek
- /plannen/{planId}/structuurvisiegebieden/{id}
- /plannen/{planId}/structuurvisiecomplexen
- /plannen/{planId}/structuurvisiecomplexen/_zoek
- /plannen/{planId}/structuurvisiecomplexen/{id}
- /plannen/{planId}/structuurvisieverklaringen
- /plannen/{planId}/structuurvisieverklaringen/_zoek
- /plannen/{planId}/structuurvisieverklaringen/{id}
- /plannen/{planId}/besluitvlakken
- /plannen/{planId}/besluitvlakken/_zoek
- /plannen/{planId}/besluitvlakken/{id}
- /plannen/{planId}/besluitsubvlakken
- /plannen/{planId}/besluitsubvlakken/_zoek
- /plannen/{planId}/besluitsubvlakken/{id}
- /plannen/{planId}/bekendmakingen
- /plannen/{planId}/gerelateerde-plannen
- /info
- /health
*/

/**
 * Ruimtelijke Plannen Opvragen API
 * @description this API contains all data w.r.t. bestemmingsplannen. This API will eventually be replaced by the DSO, when all data has migrated.
 * @param geometry GeoJSON object, as specified by the specification.
 * @param method All methods available in the API, see paths in the Open API specification or visit the link
 * @link https://developer.overheid.nl/apis/dso-ruimtelijke-plannen-opvragen, https://aandeslagmetdeomgevingswet.nl/ontwikkelaarsportaal/api-register/api/rp-opvragen/
 * For documentation see (can be outdated): https://redocly.github.io/redoc/?url=https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/
 */
class RuimtelijkePlannenAPI {
  private key: string;
  private url: string;
  constructor(apiUrl: string, key: string) {
    this.key = key;
    this.url = apiUrl;
  }
  /**
     *  
     * @param geoJson {
                        "_geo": {
                          "contains": {
                            "type": "Point",
                            "coordinates": [
                              5.960233,
                              52.179515
                            ]
                          }
                        }
                      }
     */
  async plannen(geoJson: object) {
    const path = "plannen/_zoek";
    const url = this.url + path;
    const headers = new Headers();
    headers.append("x-api-key", this.key.toString());
    headers.append("content-Crs", "EPSG:28992");
    headers.append("Content-Type", "application/json");

    const body = JSON.stringify(geoJson);

    const response = await postRequest(url, headers, body);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `POST request failed: ${response.status} ${response.statusText}\n${data}\nGiven URL: ${url}`
      );
    }

    return data;
  }

  async teksten(planId: object) {
    const path = "plannen/_zoek";
    const url = this.url + path;
    const headers = new Headers();
    headers.append("x-api-key", this.key.toString());
    headers.append("content-Crs", "EPSG:28992");
    headers.append("Content-Type", "application/json");

    const body = JSON.stringify(planId);

    const response = await postRequest(url, headers, body);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `POST request failed: ${response.status} ${response.statusText}\n${data}\nGiven URL: ${url}`
      );
    }

    return data;
  }

  async artikelen(zoekObject: object) {
    const path = "plannen/{planId}/artikelen/_zoek";
    const url = this.url + path;
    const headers = new Headers();
    headers.append("x-api-key", this.key.toString());
    headers.append("content-Crs", "EPSG:28992");
    headers.append("Content-Type", "application/json");

    const body = JSON.stringify(zoekObject);

    const response = await postRequest(url, headers, body);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `POST request failed: ${response.status} ${response.statusText}\n${data}\nGiven URL: ${url}`
      );
    }

    return data;
  }

  async bestemmingsvlakZoek(zoekObject: object) {
    const path = "plannen/{planId}/bestemmingsvlakken/_zoek";
    const url = this.url + path;
    const headers = new Headers();
    headers.append("x-api-key", this.key.toString());
    headers.append("content-Crs", "EPSG:28992");
    headers.append("Content-Type", "application/json");

    const body = JSON.stringify(zoekObject);

    const response = await postRequest(url, headers, body);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `POST request failed: ${response.status} ${response.statusText}\n${data}\nGiven URL: ${url}`
      );
    }

    return data;
  }

  async bestemmingsvlak(planId: string, bestemingsvlakId: string) {
    const path = `plannen/${planId}/bestemmingsvlakken/${bestemingsvlakId}`;
    const url = this.url + path;
    const headers = new Headers();
    headers.append("x-api-key", this.key.toString());
    headers.append("content-Crs", "EPSG:28992");
    headers.append("Content-Type", "application/json");

    const response = await getRequest(url, headers);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `POST request failed: ${response.status} ${response.statusText}\n${data}\nGiven URL: ${url}`
      );
    }

    return data;
  }

  async maatvoeringen(planId: string) {
    const path = `plannen/${planId}/maatvoeringen`;
    const url = this.url + path;
    const headers = new Headers();
    headers.append("x-api-key", this.key.toString());
    headers.append("content-Crs", "EPSG:28992");
    headers.append("Content-Type", "application/json");

    const response = await getRequest(url, headers);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `POST request failed: ${response.status} ${response.statusText}\n${data}\nGiven URL: ${url}`
      );
    }

    return data;
  }
}

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
