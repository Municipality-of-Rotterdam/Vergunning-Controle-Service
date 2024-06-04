import { getRequest, postRequest } from "./helperFunctions.js";

/**
 * All Ruimtelijke Plannen Opvragen API paths:
- /plannen
- /plannen/_zoek
- /plannen/_suggesties
- /plannen/_plansuggesties
- /plannen/{planId}
- /plannen/{planId}/cartografiesummaries
- /plannen/{planId}/cartografiesummaries/{id}
- /plannen/{planId}/teksten
- /plannen/{planId}/teksten/{id}
- /plannen/{planId}/artikelen/_zoek
- /plannen/{planId}/bestemmingsvlakken
- /plannen/{planId}/bestemmingsvlakken/_zoek
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
- /plannen/{planId}/maatvoeringen
- /plannen/{planId}/maatvoeringen/_zoek
- /plannen/{planId}/maatvoeringen/{id}
- /plannen/{planId}/figuren
- /plannen/{planId}/figuren/_zoek
- /plannen/{planId}/figuren/{id}
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

// IMPORTANT! This class and API are a WIP, the implementation is subject to change so please check the links in the doc comment below!

/**
 * Ruimtelijke Plannen Opvragen API
 * @description this API contains all data w.r.t. bestemmingsplannen. This API will eventually be replaced by the DSO, when all data has migrated.
 * @param geometry GeoJSON object, as specified by the specification.
 * @param method All methods available in the API, see paths in the Open API specification or visit the link
 * @link https://developer.overheid.nl/apis/dso-ruimtelijke-plannen-opvragen, https://aandeslagmetdeomgevingswet.nl/ontwikkelaarsportaal/api-register/api/rp-opvragen/
 * For documentation see (can be outdated): https://redocly.github.io/redoc/?url=https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/
 */
export class RuimtelijkePlannenAPI {
  private key: string;
  private url: string;
  private headers: Headers;
  constructor(apiUrl: string, key: string) {
    this.key = key;
    this.url = apiUrl;
    this.headers = new Headers();
    this.headers.append("x-api-key", this.key.toString());
    this.headers.append("content-Crs", "epsg:28992");
    this.headers.append("Content-Type", "application/json");
    this.headers.append("maxRedirects", "20");
  }

  endpoint(path: string, params?: { [key: string]: string }): string {
    if (params) {
      return (
        this.url +
        path +
        "?" +
        Object.entries(params)
          .map(([k, v]) => `${k}=${v}`)
          .join("&")
      );
    } else {
      return this.url + path;
    }
  }

  async post(path: string, body?: any, params?: { [key: string]: string }) {
    const url = this.endpoint(path, params);
    const response = await postRequest(url, this.headers, JSON.stringify(body));
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `POST request failed: ${response.status} ${response.statusText}\n${Object.values(data)}\nGiven URL: ${url}`,
      );
    }
    return data;
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
  async plannen(geoJson: object, parameters?: { [key: string]: string }) {
    return this.post("plannen/_zoek", geoJson, parameters);
  }

  async tekstenZoek(planId: string, geoJson: object) {
    return this.post(`plannen/${planId}/artikelen/_zoek`, geoJson);
  }

  async enkeleTekst(planId: string, tekstId: string) {
    return this.post(`plannen/${planId}/teksten/${tekstId}`);
  }

  async bestemmingsvlakZoek(planId: string, geoJson: object) {
    return this.post(`plannen/${planId}/bestemmingsvlakken/_zoek`, geoJson);
  }

  async bouwaanduidingenZoek(planId: string, geoJson: object) {
    return this.post(`plannen/${planId}/bouwaanduidingen/_zoek`, geoJson);
  }

  async maatvoeringen(planId: string, geoJson: object) {
    return this.post(`plannen/${planId}/maatvoeringen/_zoek`, geoJson);
  }
}
