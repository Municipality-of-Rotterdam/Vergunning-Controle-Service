import { fetchWithProvenance } from '@root/provenance/fetchWithProvenance.js'

type ApiArgs = {
  headers?: HeadersInit
  params: Record<string, string | number>
  path: string
  body?: any
}
export class API {
  base: string
  headersInit?: HeadersInit
  constructor(base: string, headers?: HeadersInit) {
    this.base = base
    this.headersInit = headers
  }
  private async send({ headers, params, path, body }: ApiArgs): Promise<Response> {
    // Construct headers
    const headersObject = new Headers(Object.assign(headers ?? {}, this.headersInit))

    // Construct URL
    let url = `${this.base}${path}`
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

    try {
      console.info(`Fetching ${url}`)
      return await fetchWithProvenance(url, options)
    } catch (error) {
      throw new Error(`API request failed: ${error instanceof Error ? error.message : error}`)
    }
  }
  async json(args: ApiArgs): Promise<any> {
    const response = await this.send(args)
    if (response.ok) return response.json()
    throw new Error(`API failed with ${response.status}`)
  }
  async xml(args: ApiArgs): Promise<any> {
    const response = await this.send(args)
    if (response.ok) return response.text()
    throw new Error(`API failed with ${response.status}`)
  }
}
