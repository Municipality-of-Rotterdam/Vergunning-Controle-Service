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

import { getCurrentDate, postRequest } from "./helperFunctions.js";

// IMPORTANT! This class and API are a WIP, the implementation is subject to change so please check the links in the doc comment below!
/**
 * Omgevingsdocument presenteren API
 * @description this API contains all data w.r.t. the DSO and should contain the bestemmingsplannen/omgevingswet data
 * @param geometry GeoJSON object, as specified by the specification.
 * @param method All methods available in the API, see paths in the Open API specification or visit the link
 * @link https://developer.overheid.nl/apis/dso-omgevingsdocument-presenteren, https://aandeslagmetdeomgevingswet.nl/ontwikkelaarsportaal/api-register/api/omgevingsdocument-presenteren/
 */
export class DSOAPI {
  private key: string;
  private url: string;
  constructor(apiUrl: string, key: string) {
    this.key = key;
    this.url = apiUrl;
  }
  async omgevingsnormen(locatieIdentificatie: string) {
    const path = "omgevingsnormen/_zoek";
    const url = this.url + path + `?geldigOp=${getCurrentDate()}&inWerkingOp=${getCurrentDate()}`;
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
        `POST request failed: ${response.status} ${response.statusText}\n${Object.values(data)}\nGiven URL: ${url}`,
      );
    }

    return data;
  }

  async omgevingswaarden(locatieIdentificatie: string) {
    const path = "omgevingswaarden/_zoek";
    const url = this.url + path + `?geldigOp=${getCurrentDate()}&inWerkingOp=${getCurrentDate()}`;
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
        `POST request failed: ${response.status} ${response.statusText}\n${Object.values(data)}\nGiven URL: ${url}`,
      );
    }

    return data;
  }
  async regelingen(locatieIdentificatie: string) {
    const path = "regelingen/regels/_zoek";
    const url = this.url + path + `?geldigOp=${getCurrentDate()}&inWerkingOp=${getCurrentDate()}`;
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
        `POST request failed: ${response.status} ${response.statusText}\n${Object.values(data)}\nGiven URL: ${url}`,
      );
    }

    return data;
  }
  async regelteksten(locatieIdentificatie: string) {
    const path = "omgevingswaarden/_zoek";
    const url = this.url + path + `?geldigOp=${getCurrentDate()}&inWerkingOp=${getCurrentDate()}`;
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
        `POST request failed: ${response.status} ${response.statusText}\n${Object.values(data)}\nGiven URL: ${url}`,
      );
    }

    return data;
  }
}
