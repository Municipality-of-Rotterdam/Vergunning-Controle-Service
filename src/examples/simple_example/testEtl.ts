// this ETL uses SHACL Constraints for the validation report, and creates data using SHACL Rules
import { logQuads } from '@triplyetl/etl/debug'
import { declarePrefix, Etl, Source } from '@triplyetl/etl/generic'
import { literal, str, triple } from '@triplyetl/etl/ratt'
import { validate } from '@triplyetl/etl/shacl'
import { a, xsd } from '@triplyetl/etl/vocab'

// Declare the base for all Iri's:
const baseIri = declarePrefix('https://example.org/')

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri })
  etl.use(
    triple(baseIri.concat('John'), a, baseIri.concat('Example')),
    triple(baseIri.concat('John'), baseIri.concat('Height'), literal(str('1.75'), xsd.float)),
    triple(baseIri.concat('John'), baseIri.concat('Name'), literal(str('Johnathan'), xsd.string)),
    triple(baseIri.concat('John'), baseIri.concat('Gender'), literal(str('Male'), xsd.string)),
    triple(baseIri.concat('Lisa'), a, baseIri.concat('Example')),
    triple(baseIri.concat('Lisa'), baseIri.concat('Height'), literal(str('1.65'), xsd.float)),
    triple(baseIri.concat('Lisa'), baseIri.concat('Name'), literal(str('Lisa'), xsd.string)),
    triple(baseIri.concat('Lisa'), baseIri.concat('Gender'), literal(str('1'), xsd.integer)),
    logQuads(),
    validate(Source.file('./src/examples/simple_example/simpleKnowledgeModel.ttl'))
  )
  return etl
}
