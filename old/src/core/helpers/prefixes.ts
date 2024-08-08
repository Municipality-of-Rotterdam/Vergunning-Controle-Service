import { NamespaceBuilder } from '@rdfjs/namespace'

export const prefixes = (...namespaces: NamespaceBuilder[]) => {
  return Object.entries(namespaces)
    .map(([alias, iri]) => `PREFIX ${alias}: <${iri()}>`)
    .join('\n')
}
