import { Etl, Source, fromCsv, toTriplyDb, when } from '@triplyetl/etl/generic'
import { addHashedIri, addIri, iri, pairs, str, triple } from '@triplyetl/etl/ratt'
import { a, geo, rdfs } from '@triplyetl/etl/vocab'
import { baseIri, id } from './utils/declarations.js'
import { destination } from './utils/sources-destinations.js'

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri })
  etl.use(
    fromCsv(Source.file(['./static/geodata/csv/aanduidingenL.csv',
      './static/geodata/csv/aanduidingLn.csv',
      './static/geodata/csv/aanduidingP.csv',
      './static/geodata/csv/aanduidingV.csv',
      './static/geodata/csv/bouwgebieden.csv',
      './static/geodata/csv/cultuurhistorie.csv',
      // './static/geodata/csv/cultuurhistorieN.csv',
      './static/geodata/csv/dubbeleBestem.csv',
      './static/geodata/csv/eenkelvoudigeBestem.csv',
      './static/geodata/csv/nummers.csv',
      './static/geodata/csv/nummersN.csv',
      './static/geodata/csv/staandVr.csv',
      './static/geodata/csv/standplaats.csv',
      './static/geodata/csv/vigerendeBestem.csv'
    ])),
    when('PLANID',
      addIri({
        prefix: id.geo,
        content: 'PLANID',
        key: '_geoID'
      }),
      triple('_geoID', a, geo.Feature),
      addHashedIri({
        content: ['PLANID'],
        prefix: geo.Geometry,
        key: '_geometry'
      }),
      pairs('_geoID',
        [geo.hasGeometry, '_geometry'],
        [a, iri(str('http://definities.geostandaarden.nl/def/nen3610#GeoObject'))]),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      triple('_geometry', geo.asWKT, 'WKT'),
      when('LAAG',
        triple('_geoID', rdfs.label, 'LAAG')),
    ),
    toTriplyDb(destination.geodata)
  )

  return etl
}
