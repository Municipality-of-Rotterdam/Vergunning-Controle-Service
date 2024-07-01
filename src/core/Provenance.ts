import { Store as TriplyStore } from '@triplydb/data-factory'

import grapoi from 'grapoi'
import factory from '@rdfjs/data-model'
import { dct, prov, skos, xsd, rdf, rdfs } from '@helpers/namespaces.js'
import type { GrapoiPointer } from '@helpers/grapoi.js'

export type Activity = {
  label: string
  description: string
  seeAlso: string
  source: string
  startTime: Date
  endTime: Date
}

export default class Provenance extends TriplyStore {
  public pointer: GrapoiPointer
  constructor() {
    super()
    this.pointer = grapoi({ dataset: this, factory, term: factory.blankNode() })
  }

  activity(a: Partial<Activity>, pointer?: GrapoiPointer): GrapoiPointer {
    const p = pointer ?? grapoi({ dataset: this, factory, term: factory.blankNode() })
    p.addOut(rdf('type'), prov('Activity'))
    if (a.label) p.addOut(skos('prefLabel'), factory.literal(a.label, 'nl'))
    if (a.description) p.addOut(dct('description'), factory.literal(a.description, 'en'))
    if (a.seeAlso) p.addOut(rdfs('seeAlso'), factory.literal(a.seeAlso, xsd('anyURI')))
    if (a.startTime) p.addOut(prov('startedAtTime'), factory.literal(a.startTime.toISOString(), xsd('dateTime')))
    if (a.endTime) p.addOut(prov('endedAtTime'), factory.literal(a.endTime.toISOString(), xsd('dateTime')))
    return p
  }
}
