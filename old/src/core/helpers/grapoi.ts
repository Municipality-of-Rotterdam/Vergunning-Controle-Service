import { DatasetCore, NamedNode, Quad, Term } from '@rdfjs/types'

export type GrapoiPointer = {
  in: (predicates?: Array<NamedNode>, objects?: Array<NamedNode>) => GrapoiPointer
  out: (predicates?: Array<NamedNode | null> | NamedNode, objects?: Array<NamedNode> | NamedNode) => GrapoiPointer
  hasOut: (predicates?: Array<NamedNode | null> | NamedNode, objects?: Array<Term> | Term) => GrapoiPointer
  deleteOut: (predicates?: Array<unknown> | unknown, objects?: Array<unknown> | unknown) => GrapoiPointer
  addOut: (predicates?: Array<unknown> | unknown, objects?: Array<unknown> | unknown) => GrapoiPointer
  quads: () => Array<Quad>
  trim(): GrapoiPointer
  distinct(): GrapoiPointer
  values: Array<string>
  filter: (callback: (item: GrapoiPointer) => boolean) => GrapoiPointer
  sort: (callback: (a: GrapoiPointer, b: GrapoiPointer) => number) => GrapoiPointer
  map: (callback: (item: GrapoiPointer) => any) => any
  value: string | number
  isList: () => boolean
  deleteList: () => GrapoiPointer
  list: () => Array<GrapoiPointer>
  ptrs: Array<{ dataset: DatasetCore } & GrapoiPointer>
  clone: (data?: unknown) => GrapoiPointer
  node: (pointers?: Array<unknown>) => GrapoiPointer
  execute: (paths: Array<unknown>) => GrapoiPointer
  executeAll: (paths: Array<unknown>) => GrapoiPointer
  replace: (replacement: unknown) => GrapoiPointer
  term: Term
  terms: Array<Term>
  [Symbol.iterator]: () => Iterator<GrapoiPointer>
}
