import { getRequest, postRequest } from "./helperFunctions.js";

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
export class RuimtelijkePlannenAPI {
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
