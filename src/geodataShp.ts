// import { logRecord } from '@triplyetl/etl/debug'
import { Etl, Source, fromShapefile, toTriplyDb, whenForEach } from '@triplyetl/etl/generic'
import { addHashedIri, addIri, triple, wkt } from '@triplyetl/etl/ratt'
import { a, geo, rdfs } from '@triplyetl/etl/vocab'
import { baseIri, def, id } from './utils/declarations.js'
import { destination } from './utils/sources-destinations.js'

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri })
  etl.use(
    fromShapefile(Source.file('./static/geodata/bouwgeb.shp')),
    // logRecord({ stop: true }),
    whenForEach('@recordId', [
      addIri({
        prefix: id.geo,
        content: '@id',
        key: '_geoID'
      }),

      triple('_geoID', a, geo.Feature),
      triple('_geoID', rdfs.label, '@id'),
      triple('_gebouwID', def.bouwlaag, '_bouwlaag'),
      whenForEach('geometry.coordinates',
        addHashedIri({
          content: ['$parent.@id', 'geometry'],
          prefix: geo.Geometry,
          key: '_geometry'
        }),
        triple('_geoID', geo.hasGeometry, '_geometry'),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        wkt.addPoint({
          latitude: '_coordinates[0]',
          longitude: '_coordinates[1]',
          key: '_point'
        }),
        triple('_geometry', geo.asWKT, '_point')
      )
    ])
  )
  toTriplyDb(destination.vergunningscontroleservice)
  //   await etl.copySource(source.model, destination.vergunningscontroleservice)
  return etl
}
