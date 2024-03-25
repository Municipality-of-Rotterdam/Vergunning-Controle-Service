import { Etl, fromJson, toTriplyDb, when, whenForEach } from '@triplyetl/etl/generic'
import { addHashedIri, addIri, literal, pairs, triple } from '@triplyetl/etl/ratt'
import { a, dbo, rdfs, xsd } from '@triplyetl/etl/vocab'
import { validate } from '@triplyetl/etl/shacl'
import { source, destination } from './utils/sources-destinations.js'
import { baseIri, id, def, prefix_graph } from './utils/declarations.js'

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri })
  etl.use(
    fromJson(source.buildings),
    whenForEach('@gebouwen', [
      addIri({
        prefix: id.gebouw,
        content: '@id',
        key: '_gebouwID'
      }),
      triple('_gebouwID', a, dbo.Building),
      when('hoogte',
        triple('_gebouwID', def.hoogte, literal('hoogte', xsd.integer))
      ),
      when('gebouwType',
        triple('_gebouwID', def.gebouwType, literal('gebouwType', xsd.string))
      ),
      when('woonwijkCode',
        triple('_gebouwID', def.woonwijk, literal('woonwijkCode', xsd.string))
      ),
      when('aantalPersonen',
        triple('_gebouwID', def.aantalPersonen, literal('aantalPersonen', xsd.integer))
      ),
      addHashedIri({
        content: '@id',
        prefix: id.bouwlaag,
        key: '_bouwlaag'
      }),
      triple('_gebouwID', def.bouwlaag, '_bouwlaag'),
      whenForEach('bouwlaag',
        addHashedIri({
          content: ['$parent.@id', 'id'],
          prefix: id.bouwlaag,
          key: '_bouwlaagID'
        }),
        pairs('$parent._bouwlaag',
          [ a, def.Bouwlaag ],
          [ def.bouwlaagElement, '_bouwlaagID' ]
        ),
        when('id',
          triple('_bouwlaagID', rdfs.label, 'id')
        ),
        when('verdieping',
          triple('_bouwlaagID', def.verdieping, 'verdieping')
        ),
        when('hoogte',
          triple('_bouwlaagID', def.hoogte, 'hoogte')
        )
      ),
      when('opmerking',
        triple('_gebouwID', rdfs.comment, 'opmerking')
      )
    ]),
    validate(source.model,
      {
        graph: prefix_graph.concat('report'),
        terminateOn: 'Never'
      }
    ),
    toTriplyDb(destination.vergunningscontroleservice)
  )
  await etl.copySource(source.model, destination.vergunningscontroleservice)
  return etl
}
