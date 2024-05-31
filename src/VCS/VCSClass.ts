/* eslint-disable no-console */
import dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { IFCTransform } from "./IFCTransform.js";
import { executeCommand } from "./helperFunctions.js";

dotenv.config();

// TODO replace every __dirname for relative path
export const __dirname = ".";

// FOR ETL
// TODO need time logging per request - a retrieved rule should have a timelog attached in the SHACL data message string
// TODO should have original applied rule (juridische regel) text element included in the SHACL data message string

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
 */
export default class VCS {
  private ifcFilePath: string;
  private gltfOutputName: string;

  constructor(ifcFilePath: string, gltfOutputName: string) {
    this.ifcFilePath = ifcFilePath;
    this.gltfOutputName = gltfOutputName;
  }

  IFC = {
    transform: () => new IFCTransform(this.ifcFilePath, this.gltfOutputName),
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
          `IDSValidationReport${idsFilePath.length == 1 ? "" : `${index + 1}`}.html`,
        );

        const bcfReportDestinationPath = path.join(
          dataDir,
          `IDSValidationReport${idsFilePath.length == 1 ? "" : `${index + 1}`}.bcf`,
        );

        await executeCommand(`python3 -m pip install -r ${requirements} --quiet`);
        try {
          await executeCommand(
            `python3 ${pythonScriptPath} "${ifcFilePath}" "${ids}" -r "${htmlReportDestinationPath}" -b "${bcfReportDestinationPath}"`,
          );
        } catch (error) {
          throw error;
        }
      }
    },
  };
}
