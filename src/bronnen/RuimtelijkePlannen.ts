import { ApiActivity } from '@root/core/Activity.js'

/**
 * Ruimtelijke Plannen Opvragen API
 * @description this API contains all data w.r.t. bestemmingsplannen. This API will eventually be replaced by the DSO, when all data has migrated.
 * @param geometry GeoJSON object, as specified by the specification.
 * @param method All methods available in the API, see paths in the Open API specification or visit the link
 * @link https://developer.overheid.nl/apis/dso-ruimtelijke-plannen-opvragen, https://aandeslagmetdeomgevingswet.nl/ontwikkelaarsportaal/api-register/api/rp-opvragen/
 * For documentation see (can be outdated): https://redocly.github.io/redoc/?url=https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/
 */
export class RuimtelijkePlannenActivity extends ApiActivity<any, any> {
  constructor({ url, body, params }: { url: string; body?: any; params?: Record<string, string> }) {
    super({
      name: `Ruimtelijke plannen request: ${url}`,
      body: body ? JSON.stringify(body) : undefined,
      url: 'https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4' + url,
      params,
      headers: {
        'x-api-key': process.env.RP_API_TOKEN ?? '',
        'content-Crs': 'epsg:28992',
        'content-type': 'application/json',
        maxRedirects: '20',
      },
    })
  }
  async _run() {
    const response = await this.send()
    if (!response.ok) throw new Error(response.statusText)
    return response.json()
  }
}
