import { declarePrefix, Etl, fromJson, toTriplyDb, when, whenForEach } from '@triplyetl/etl/generic'
import { addHashedIri, addIri, literal, pairs, triple } from '@triplyetl/etl/ratt'
import { a, dbo, rdfs, xsd } from '@triplyetl/etl/vocab'
import { validate } from '@triplyetl/etl/shacl'
import { source, destination } from './utils/sources-destinations.js'

// Declare the base for all Iri's & other Iri's used in this ETL:
const baseIri = declarePrefix('https://example.org')
const def = baseIri.concat('def')
const id = baseIri.concat('id')
const woonwijk = def.concat('/Woonwijk')
const hoogte = def.concat('/Hoogte')
const gebouwType = def.concat('/GebouwType')
const aantalPersonen = def.concat('/AantalPersonen')
const heeftBouwlaag = def.concat('/heeftBouwlaag')
const verdieping = def.concat('/Verdieping')

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri })
  etl.use(
    fromJson(source.buildings),
    whenForEach('@gebouwen', [
      addIri({
        prefix: id.concat('/'),
        content: '@id',
        key: '_gebouwID'
      }),
      triple('_gebouwID', a, dbo.Building),
      when('hoogte',
        triple('_gebouwID', hoogte, literal('hoogte', xsd.integer))
      ),
      when('gebouwType',
        triple('_gebouwID', gebouwType, literal('gebouwType', xsd.string))
      ),
      when('woonwijkCode',
        triple('_gebouwID', woonwijk, literal('woonwijkCode', xsd.string))
      ),
      when('aantalPersonen',
        triple('_gebouwID', aantalPersonen, literal('aantalPersonen', xsd.integer))
      ),
      addHashedIri({
        content: '@id',
        prefix: baseIri.concat('Bouwlaag/'),
        key: '_bouwlaag'
      }),
      triple('_gebouwID', heeftBouwlaag, '_bouwlaag'),
      whenForEach('bouwlaag',
        addHashedIri({
          content: ['$parent.@id', 'id'],
          prefix: baseIri.concat('bouwlaagID/'),
          key: '_bouwlaagID'
        }),
        pairs('$parent._bouwlaag',
          [
            a, baseIri.concat('Bouwlaag')
          ],
          [
            def.concat('/bouwlaagElementen'), '_bouwlaagID'
          ]
        ),
        when('id',
          triple('_bouwlaagID', rdfs.label, 'id')
        ),
        when('verdieping',
          triple('_bouwlaagID', verdieping, 'verdieping')
        ),
        when('hoogte',
          triple('_bouwlaagID', hoogte, 'hoogte')
        )
      ),
      when('opmerking',
        triple('_gebouwID', rdfs.comment, 'opmerking')
      )
    ]),
    validate(source.model,
      {
        graph: baseIri.concat('graph/report'),
        terminateOn: 'Never'
      }
    ),
    toTriplyDb(destination.vergunningscontroleservice)
  )
  await etl.copySource(source.model, destination.vergunningscontroleservice)
  return etl
}
