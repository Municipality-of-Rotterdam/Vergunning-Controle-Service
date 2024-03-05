// Import middlewares and other required libraries.
import { declarePrefix, Etl, fromCsv, toTriplyDb } from '@triplyetl/etl/generic'
import { concat, pairs, iri, literal, split } from '@triplyetl/etl/ratt'
import { validate } from '@triplyetl/etl/shacl'
import { source, destination } from './utils/sources-destinations.js'

// Import vocabularies.
import { a, foaf, owl, xsd } from '@triplyetl/etl/vocab'

// Declare the base for all Iri's:
const baseIri = declarePrefix('https://demo.triplydb.com/GemeenteRotterdam/vergunningscontroleservice/')

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri })
  etl.use(

    // Connect to one or more data sources.
    fromCsv(source.people),

    // Transformations change data in the Record.
    concat({
      content: ['firstName', 'lastName'],
      separator: ' ',
      key: 'fullName'
    }),

    split({
      content: 'firstName',
      key: 'names',
      separator: ' '
    }),

    // Assertions add linked data to the RDF store.
    pairs(iri(etl.standardPrefixes.id, '$recordId'),
      [a, foaf.Person],
      [foaf.firstName, 'names'],
      [foaf.lastName, 'lastName'],
      [foaf.name, 'fullName'],
      [foaf.birthday, literal('birthday', xsd.date)],
      [owl.sameAs, iri('WikiPage')],
      [foaf.depiction, iri('image')]
    ),

    // Validation ensures that your instance data follows the data model.
    validate(source.model),

    // Publish your data in TriplyDB.
    toTriplyDb(destination.vergunningscontroleservice)
  )
  return etl
}
