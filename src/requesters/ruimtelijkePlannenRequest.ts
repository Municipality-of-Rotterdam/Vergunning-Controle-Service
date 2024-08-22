import { fetchWithProvenance } from '@root/provenance/fetchWithProvenance.js'

export type ApiArgs = {
  params: { [key: string]: string | number }
  path: string
  body?: any
}

export const ruimtelijkePlannenURL = 'https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4'

/**
 * Ruimtelijke Plannen Opvragen API
 * @description this API contains all data w.r.t. bestemmingsplannen. This API will eventually be replaced by the DSO, when all data has migrated.
 * @link https://developer.overheid.nl/apis/dso-ruimtelijke-plannen-opvragen, https://aandeslagmetdeomgevingswet.nl/ontwikkelaarsportaal/api-register/api/rp-opvragen/
 * For documentation see (can be outdated): https://redocly.github.io/redoc/?url=https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/
 */
export async function ruimtelijkePlannenRequest({ params, path, body }: ApiArgs): Promise<any> {
  // Construct headers
  const headers = {
    'x-api-key': process.env.RP_API_TOKEN ?? '',
    'content-Crs': 'epsg:28992',
    'content-type': 'application/json',
    maxRedirects: '20',
  }

  // Construct URL
  let url = `${ruimtelijkePlannenURL}${path}`
  if (params)
    url +=
      '?' +
      Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')

  const options: RequestInit =
    body === undefined ? { method: 'GET', headers } : { method: 'POST', headers, body: JSON.stringify(body) }

  try {
    const response = await fetchWithProvenance(url, options)
    if (!response.ok) throw new Error(`API failed with ${response.status}: ${response.statusText}`)
    const text = await response.text()
    return JSON.parse(text)
  } catch (error) {
    console.log(error)
  }
}
