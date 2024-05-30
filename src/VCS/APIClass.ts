/* eslint-disable no-console */
import dotenv from "dotenv";
import { DSOAPI } from "./DSOAPI.js";

import { checkAPIKey } from "./helperFunctions.js";
import { RuimtelijkePlannenAPI } from "./RuimtelijkePlannenAPI.js";

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
export default class API {
  private apiUrl: string | undefined;
  private key: string | undefined;

  RuimtelijkePlannen = {
    RuimtelijkePlannen: (): RuimtelijkePlannenAPI => {
      checkAPIKey("Ruitemlijke Plannen API");
      this.key = process.env.Ruimtelijke_plannen_aanvragen_API_TOKEN;
      this.apiUrl = "https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/";
      return new RuimtelijkePlannenAPI(this.apiUrl, this.key!);
    },
  };

  DSOPresenteren = {
    DSOPresenteren: (environment: "Production" | "Pre-Production"): DSOAPI => {
      if (environment == "Production") {
        checkAPIKey("DSO Production API");
        this.key = process.env.DSO_Production_API_TOKEN;
        this.apiUrl = "https://service.omgevingswet.overheid.nl/publiek/omgevingsdocumenten/api/presenteren/v7/";
      } else {
        checkAPIKey("DSO Pre-Production API");
        this.key = process.env.DSO_PreProduction_API_TOKEN;
        this.apiUrl = "https://service.pre.omgevingswet.overheid.nl/publiek/omgevingsdocumenten/api/presenteren/v7/";
      }
      return new DSOAPI(this.apiUrl, this.key!);
    },
  };
}
