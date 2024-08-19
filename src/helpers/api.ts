import { fetchWithProvenance } from '@root/provenance/fetchWithProvenance.js'
import { geo, sf } from './namespaces.js'
import { geojsonToWKT } from '@terraformer/wkt'
export * as api from './api.js'

type ApiArgs = {
  headers?: HeadersInit
  params: { [key: string]: string | number }
  path: string
  body?: any
}

const ruimtelijkePlannenURL = 'https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4'

const reviver = (_: string, value: any) => {
  // if (typeof value == 'object')
  if (value !== null && typeof value == 'object') {
    if (value['id']) {
      value['@id'] = `${ruimtelijkePlannenURL}#${value['id']}`
    }

    const geometry = value['geometrie']
    if (geometry) {
      value[geo('hasDefaultGeometry').value] = {
        '@type': sf(geometry.type).value,
        [geo('asWKT').value]: {
          '@value': `<http://www.opengis.net/def/crs/EPSG/0/28992> ${geojsonToWKT(geometry)}`,
          '@type': geo('wktLiteral').value,
        },
      }
    }
  }
  return value
}

/**
 * Ruimtelijke Plannen Opvragen API
 * @description this API contains all data w.r.t. bestemmingsplannen. This API will eventually be replaced by the DSO, when all data has migrated.
 * @link https://developer.overheid.nl/apis/dso-ruimtelijke-plannen-opvragen, https://aandeslagmetdeomgevingswet.nl/ontwikkelaarsportaal/api-register/api/rp-opvragen/
 * For documentation see (can be outdated): https://redocly.github.io/redoc/?url=https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/
 */
export async function ruimtelijkePlannen({ headers, params, path, body }: ApiArgs): Promise<any> {
  // Construct headers
  const headersObject = new Headers(
    Object.assign(
      {
        'x-api-key': process.env.RP_API_TOKEN ?? '',
        'content-Crs': 'epsg:28992',
        'content-type': 'application/json',
        maxRedirects: '20',
      },
      headers ?? {},
    ),
  )

  // Construct URL
  let url = `${ruimtelijkePlannenURL}${path}`
  if (params)
    url +=
      '?' +
      Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')

  const options: RequestInit =
    body === undefined
      ? { method: 'GET', headers: headersObject }
      : { method: 'POST', headers: headersObject, body: JSON.stringify(body) }

  const response = await fetchWithProvenance(url, options)
  if (!response.ok) throw new Error(`API failed with ${response.status}: ${response.statusText}`)
  const text = await response.text()
  return JSON.parse(text, reviver)
}
ruimtelijkePlannen.url = ruimtelijkePlannenURL
