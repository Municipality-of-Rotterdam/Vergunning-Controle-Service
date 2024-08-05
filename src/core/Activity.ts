import grapoi from 'grapoi'
import { GrapoiPointer } from './helpers/grapoi.js'
import { dct, prov, skos, xsd, rdf, rdfs } from '@helpers/namespaces.js'
import factory from '@rdfjs/data-model'
import { XMLParser } from 'fast-xml-parser'
import { Store as TriplyStore } from '@triplydb/data-factory'
import App from '@triply/triplydb'
import { VariableValues } from '@triply/triplydb/Query.js'

import { headerLog } from '@helpers/headerLog.js'
import { NamespaceBuilder } from '@rdfjs/namespace'

type ActivityInfo = {
  name: string
  description?: string
}

export abstract class ActivityA<S, T> {
  public name: string
  public description?: string
  public baseIRI?: string
  public provenanceGraph?: TriplyStore
  public provenance?: GrapoiPointer
  constructor({ name, description }: ActivityInfo) {
    this.name = name
    this.description = description
  }
  protected startProvenance(parent?: ActivityA<any, any>) {
    if (!this.baseIRI) throw new Error(`unknown baseIRI for ${this.name}`)
    if (this.provenance) throw new Error('Provenance was already set')
    const nodeValue = `${this.baseIRI}${this.name.replace(/\W/g, '')}`
    const provenanceNode = nodeValue ? factory.namedNode(nodeValue) : factory.blankNode
    if (parent) {
      if (!parent.provenance) throw new Error("Parent's provenance was not yet set")
      parent.provenance.addOut(dct('hasPart'), provenanceNode)
      this.provenanceGraph = parent.provenanceGraph
    } else {
      this.provenanceGraph = new TriplyStore()
    }
    const pointer = (this.provenance = grapoi({ dataset: this.provenanceGraph, factory, term: provenanceNode }))
    pointer.addOut(rdf('type'), prov('Activity'))
    pointer.addOut(skos('prefLabel'), factory.literal(this.name))
    if (this.description) pointer.addOut(dct('description'), factory.literal(this.description))
    pointer.addOut(prov('startedAtTime'), factory.literal(new Date().toISOString(), xsd('dateTime')))
  }
  protected endProvenance() {
    if (!this.provenance) throw new Error('Provenance was not yet set')
    this.provenance.addOut(prov('endedAtTime'), factory.literal(new Date().toISOString(), xsd('dateTime')))
  }

  abstract _run(input: S): Promise<T>
  async run(input: S, parent?: ActivityA<any, any>): Promise<T> {
    // TODO: Temporary, until there is a better solution
    if (input instanceof Object && 'baseIRI' in input) {
      this.baseIRI = input.baseIRI as string
      if (parent) parent.baseIRI = this.baseIRI
    } else if (parent && parent.baseIRI) this.baseIRI = parent.baseIRI

    headerLog(this.name)
    this.startProvenance(parent)
    const result = await this._run(input)
    this.endProvenance()

    return result
  }
}

export class Activity<S extends {}, T extends {}> extends ActivityA<S, T> {
  public action: (input: S, thisActivity: Activity<S, T>) => Promise<T>
  constructor({ name, description }: ActivityInfo, action: (input: S, thisActivity: Activity<S, T>) => Promise<T>) {
    super({ name, description })
    this.action = action
  }
  async _run(ctx: S) {
    return this.action(ctx, this)
  }
}

export class ActivityGroup extends ActivityA<{}, {}> {
  constructor(info: ActivityInfo, children: ActivityA<{}, {}>[]) {
    super(info)
    this.children = children
  }
  public children: ActivityA<{}, {}>[]
  async _run(ctx: {}): Promise<{}> {
    for (const child of this.children) {
      const childResult = await child.run(ctx, this)
      if (childResult) {
        Object.assign(ctx, childResult)
      }
    }
    return ctx
  }
}

type Request = {
  url: string
  headers: Record<string, string>
  params?: Record<string, string | number | boolean>
  body?: string
}

type Extractor<T> = {
  extract: (x: any) => T
}

export abstract class ApiActivity<S, T> extends ActivityA<S, T> {
  public url: string
  public headers: Headers
  public body?: string
  constructor({ name, description, url, headers, params, body }: ActivityInfo & Request) {
    super({ name, description })
    this.url = url
    this.headers = new Headers()
    this.body = body
    for (const [k, v] of Object.entries(headers)) this.headers.append(k, v)
    if (params) {
      const p = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
      this.url += '?' + p
    }
  }

  protected async send(): Promise<Response> {
    const requestOptions: RequestInit = this.body
      ? {
          method: 'POST',
          headers: this.headers,
          body: this.body,
        }
      : { method: 'GET', headers: this.headers }

    try {
      return await fetch(this.url, requestOptions)
    } catch (error) {
      throw new Error(`API request failed: ${error instanceof Error ? error.message : error}`)
    }
  }
}

export class SparqlActivity<S> extends ApiActivity<S, any[]> {
  constructor({ name, description, url, body }: ActivityInfo & Pick<Request, 'body' | 'url'>) {
    super({
      name,
      description,
      body: JSON.stringify({ query: body }),
      url, // `${apiUrl}/datasets/${account ?? user.slug}/${datasetName}/sparql`
      headers: {
        Accepts: 'application/sparql-results+json, application/n-triples',
        'content-type': 'application/json',
        Authorization: 'Bearer ' + process.env.TRIPLYDB_TOKEN!,
      },
    })
  }
  async _run() {
    const response = await this.send()
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return response.json() as unknown as any[]
  }
}

export class RuleRepoActivity extends ActivityA<any, any> {
  url: string
  query: string
  version: number | 'latest'
  variables: VariableValues
  rpt: NamespaceBuilder // TODO: Use generic namespaces or make global
  constructor(
    {
      name,
      description,
      query,
      version,
      variables,
      url,
    }: ActivityInfo & { query: string; version: number | 'latest'; variables: VariableValues; url: string },
    rpt: NamespaceBuilder,
  ) {
    super({
      name,
      description,
    })
    this.url = url
    this.query = query
    this.version = version
    this.variables = variables
    this.rpt = rpt
  }
  async _run() {
    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
    const orgUser = await triply.getAccount('rotterdam-rule-repository')
    const query_0 = await orgUser.getQuery(this.query)
    const query_1 = await query_0.useVersion(this.version)
    const sparqlQuery = query_1.getString(this.variables)

    if (this.provenance)
      this.provenance.addOut(this.rpt('sparqlUrl'), factory.literal(await query_1.getApiUrl(), xsd('anyUri')))

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        Accepts: 'application/sparql-results+json, application/n-triples',
        'content-type': 'application/json',
        Authorization: 'Bearer ' + process.env.TRIPLYDB_TOKEN!,
      },
      body: JSON.stringify({ query: sparqlQuery }),
    }

    try {
      return await fetch(this.url, requestOptions)
    } catch (error) {
      throw new Error(`API request failed: ${error instanceof Error ? error.message : error}`)
    }
  }
}

export class XmlActivity<S, T> extends ApiActivity<S, T> {
  public extract: (xml: any) => T
  constructor({
    name,
    description,
    body,
    url,
    params,
    extract,
  }: ActivityInfo & Pick<Request, 'body' | 'url' | 'params'> & Extractor<T>) {
    super({
      name,
      description,
      url,
      params,
      headers: {
        'Content-Type': 'application/xml',
      },
      body,
    })
    this.extract = extract
  }

  async _run(): Promise<T> {
    const response = await this.send()
    const data = await response.text()
    const parser = new XMLParser()
    const obj = this.extract(parser.parse(data))
    return obj
  }
}
