import grapoi from 'grapoi'
import { GrapoiPointer } from './helpers/grapoi.js'
import { dct, prov, skos, xsd, rdf, rdfs, rpt } from '@helpers/namespaces.js'
import factory from '@rdfjs/data-model'

import { headerLog } from '@helpers/headerLog.js'

type ActivityInfo = {
  name: string
  description?: string
}

export abstract class ActivityA<S, T> {
  public name: string
  public description?: string
  public provenance?: GrapoiPointer
  abstract run(input: S): Promise<T>
  constructor({ name, description }: ActivityInfo) {
    this.name = name
    this.description = description
  }
  startProvenance() {
    if (!this.provenance) throw new Error('Have not set provenance pointer')
    const pointer = this.provenance
    pointer.addOut(rdf('type'), prov('Activity'))
    pointer.addOut(skos('prefLabel'), factory.literal(this.name))
    if (this.description) pointer.addOut(dct('description'), factory.literal(this.description))
    pointer.addOut(prov('startedAtTime'), factory.literal(new Date().toISOString(), xsd('dateTime')))
  }
  endProvenance() {
    if (!this.provenance) throw new Error('Have not set provenance pointer')
    const pointer = this.provenance
    pointer.addOut(prov('endedAtTime'), factory.literal(new Date().toISOString(), xsd('dateTime')))
  }
}

export class Activity<S extends {}, T extends {}> extends ActivityA<S, T> {
  constructor(
    { name, description }: ActivityInfo,
    action: (ctx: S, provenance: GrapoiPointer) => Promise<T>,
    children?: Activity<S, T>[],
  ) {
    super({ name, description })
    this.action = action
    this.children = children ?? []
  }
  public action: (ctx: S, provenance: GrapoiPointer) => Promise<T>
  public parent?: Activity<any, any>

  public children: Activity<S, T>[]
  async run(ctx: S): Promise<T> {
    headerLog(this.name)
    const label = this.name ? `https://demo.triplydb.com/rotterdam/${this.name.replace(/\W/g, '')}` : null
    const provenanceNode = label ? factory.namedNode(label) : factory.blankNode

    /* @ts-ignore TODO */
    const db = ctx.provenanceDataset
    if (!db) throw new Error('should have a database at this point')

    let provenance: GrapoiPointer
    if (this.parent) {
      if (!this.parent.provenance) {
        throw new Error('should have provenance at this point')
      }
      this.parent.provenance.addOut(dct('hasPart'), provenanceNode)
    }
    this.provenance = provenance = grapoi({ dataset: db, factory, term: provenanceNode })
    this.startProvenance()
    this.prepare()
    const mainResult = await this.action(ctx, provenance)
    if (mainResult) {
      Object.assign(ctx, mainResult)
    }
    for (const child of this.children ?? []) {
      child.parent = this
      const childResult = await child.run(ctx)
      if (childResult) {
        Object.assign(ctx, childResult)
      }
    }
    this.finish()
    this.endProvenance()
    return ctx as unknown as T
  }
  prepare() {}
  finish() {}
}
