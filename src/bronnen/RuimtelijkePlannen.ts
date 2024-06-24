/**
 * Ruimtelijke Plannen Opvragen API
 * @description this API contains all data w.r.t. bestemmingsplannen. This API will eventually be replaced by the DSO, when all data has migrated.
 * @param geometry GeoJSON object, as specified by the specification.
 * @param method All methods available in the API, see paths in the Open API specification or visit the link
 * @link https://developer.overheid.nl/apis/dso-ruimtelijke-plannen-opvragen, https://aandeslagmetdeomgevingswet.nl/ontwikkelaarsportaal/api-register/api/rp-opvragen/
 * For documentation see (can be outdated): https://redocly.github.io/redoc/?url=https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/
 */
export class RuimtelijkePlannenAPI {
  private key: string
  private url: string
  private headers: Headers

  constructor(key: string) {
    this.key = key
    this.url = 'https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/'
    this.headers = new Headers()
    this.headers.append('x-api-key', this.key.toString())
    this.headers.append('content-Crs', 'epsg:28992')
    this.headers.append('Content-Type', 'application/json')
    this.headers.append('maxRedirects', '20')
  }

  endpoint(path: string, params?: { [key: string]: string }): string {
    if (params) {
      const p = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
      return this.url + path + '?' + p
    } else {
      return this.url + path
    }
  }

  async post(path: string, body?: any, params?: { [key: string]: string }) {
    const url = this.endpoint(path, params)

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    }

    try {
      const response = await fetch(url, requestOptions)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(
          `Ruimtelijke plannen aanvraag faalde: ${response.status} ${response.statusText}\n${Object.values(data)}\n URL: ${url}`,
        )
      }

      return data
    } catch (error) {
      throw new Error(`Ruimtelijke plannen aanvraag faalde: ${error instanceof Error ? error.message : error}`)
    }
  }

  async plannen(geoJson: object, params?: { [key: string]: string }) {
    return this.post('plannen/_zoek', geoJson, params)
  }

  async tekstenZoek(planId: string, geoJson: object) {
    return this.post(`plannen/${planId}/artikelen/_zoek`, geoJson)
  }

  async enkeleTekst(planId: string, tekstId: string) {
    return this.post(`plannen/${planId}/teksten/${tekstId}`)
  }

  async bestemmingsvlakZoek(planId: string, geoJson: object, params?: { [key: string]: string }) {
    return this.post(`plannen/${planId}/bestemmingsvlakken/_zoek`, geoJson, params)
  }

  async bouwaanduidingenZoek(planId: string, geoJson: object) {
    return this.post(`plannen/${planId}/bouwaanduidingen/_zoek`, geoJson)
  }

  async maatvoeringen(planId: string, geoJson: object) {
    return this.post(`plannen/${planId}/maatvoeringen/_zoek`, geoJson)
  }
}
