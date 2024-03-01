// this ETL only uses SHACL Constraints for the validation report, and creates data using TriplyETL Ratt
import { logQuads } from '@triplyetl/etl/debug'
import { declarePrefix, Etl, fromJson, ifElse, Source, when, whenForEach } from '@triplyetl/etl/generic'
import { addIri, literal, str, triple } from '@triplyetl/etl/ratt'
import { validate } from '@triplyetl/etl/shacl'
import { a, xsd } from '@triplyetl/etl/vocab'

// Declare the base for all Iri's:
const baseIri = declarePrefix('https://example.org/')

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri })
  etl.use(
    fromJson(Source.file('./src/examples/static/example_mock_data_building.json')),
    whenForEach('@buildings', [
      addIri({
        prefix: baseIri.concat('Building'),
        content: '@id',
        key: '_buildingID'
      }),
      triple('_buildingID', a, baseIri.concat('Building')),
      when('height',
        triple('_buildingID', baseIri.concat('Height'), literal('height', xsd.integer)),
        // Check if there is a height violation:
        ifElse(
          {
            if: ctx => ctx.getNumber('height') > 15,
            then: triple('_buildingID', baseIri.concat('HeightViolation'), literal(str('true'), xsd.boolean))
          },
          {
            else: triple('_buildingID', baseIri.concat('HeightViolation'), literal(str('false'), xsd.boolean))
          }
        )
      ),
      when('buildingType',
        triple('_buildingID', baseIri.concat('BuildingType'), literal('buildingType', xsd.string))
      ),
      when('numberOfPeople',
        triple('_buildingID', baseIri.concat('NumberOfPeople'), literal('numberOfPeople', xsd.integer))
      ),
      logQuads()
    ]),
    logQuads(),
    validate(Source.file('./src/examples/static/building_knowledge_model.ttl'))
  )
  return etl
}
