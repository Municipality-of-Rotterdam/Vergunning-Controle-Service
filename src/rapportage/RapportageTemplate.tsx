import grapoi from 'grapoi'
import { readFile } from 'fs/promises'
import { rpt, rdfs, prov, dct, skos } from '@helpers/namespaces.js'
import { GrapoiPointer } from '@root/core/helpers/grapoi.js'
import Provenance from '@core/Provenance.js'

export type RapportageProps = {
  datasetName: string
  datasetUrl: string
  footprintUrl: string
  gebouw: string
  polygon: any
  geoData: any
  gltfUrl: string
  gltfDownload: string
}

const inlineScript = await readFile('./src/rapportage/inlineScript.js')

function Bestemmingsplan(source: GrapoiPointer) {
  const naam = source.out(skos('prefLabel'))
  const id = source.out(rdfs('label'))
  const url = source.out(rdfs('seeAlso'))
  return (
    <a href={url.value.toString()}>
      {naam.value} ({id.value})
    </a>
  )
}

function ProvenanceHtml(provenance: Provenance, node: GrapoiPointer) {
  const provenancePointer = grapoi({ dataset: provenance, term: node.term })
  const parts = provenancePointer.out(dct('hasPart'))
  const startTime = provenancePointer.out(prov('startedAtTime')).value
  const endTime = provenancePointer.out(prov('endedAtTime')).value
  const sparqlUrl = provenancePointer.out(rpt('sparqlUrl')).value
  const apiResponse = provenancePointer.out(rpt('apiResponse')).value
  const apiCall = provenancePointer.out(rpt('apiCall')).value
  const prefLabel = provenancePointer.out(skos('prefLabel')).value
  const description = provenancePointer.out(dct('description')).value
  return (
    <details key={node.value}>
      <summary>{prefLabel ?? node.value}</summary>
      <dl>
        {description && (
          <>
            <dt>Beschrijving</dt>
            <dd>{description}</dd>
          </>
        )}
        {startTime && (
          <>
            <dt>Starttijd</dt>
            <dd>{startTime}</dd>
          </>
        )}
        {endTime && (
          <>
            <dt>Eindtijd</dt>
            <dd>{endTime}</dd>
          </>
        )}
        {apiCall && (
          <>
            <dt>API-verzoek</dt>
            <dd>
              <a href={apiCall}>{apiCall}</a>
            </dd>
          </>
        )}
        {apiResponse && (
          <>
            <dt>API-respons</dt>
            <dd>
              <pre>{apiResponse}</pre>
            </dd>
          </>
        )}
        {sparqlUrl && (
          <>
            <dt>SPARQL query</dt>
            <dd>
              <a href={sparqlUrl}>{sparqlUrl}</a>
            </dd>
          </>
        )}
      </dl>
      {parts.map((part: GrapoiPointer) => ProvenanceHtml(provenance, part))}
    </details>
  )
}

function Controle(controle: any, provenance: Provenance) {
  const label = controle.out(rdfs('label')).value
  const validated = controle.out(rpt('passed')).value === 'true'
  const message = controle.out(rpt('message')).value
  const verwijzing = controle.out(rpt('verwijzing')).value
  const description = controle.out(dct('description')).value
  const provenanceNode = controle.out(prov('wasGeneratedBy'))
  const source = controle.out(dct('source'))
  return (
    <div key={label}>
      <hr />
      <h3 className={!validated ? 'bg-danger-subtle' : ''}>{label}</h3>
      <dl>
        <dt>Beschrijving</dt>
        <dd>{description}</dd>
        <dt>Resultaat</dt>
        <dd className="result">
          {validated ? <strong>✅</strong> : <strong>❌</strong>} {message}
        </dd>
        <dt>Bestemmingsplan</dt>
        <dd>{Bestemmingsplan(source)}</dd>
        <dt>Verwijzing</dt>
        <dd>{verwijzing}</dd>
        <dt>Provenance</dt>
        <dd className="provenance">{ProvenanceHtml(provenance, provenanceNode)}</dd>
      </dl>
    </div>
  )
}

export default function (
  { gebouw, polygon, geoData, gltfUrl, footprintUrl, datasetName, datasetUrl, gltfDownload }: RapportageProps,
  validationPointer: GrapoiPointer,
  provenance: Provenance,
  idsControle: GrapoiPointer,
) {
  const controles = validationPointer.out(rpt('controle'))
  const ifc = validationPointer.out(rpt('ifc'))
  const gitRev = validationPointer.out(rpt('gitRevision'))
  const idsFiles = idsControle.out(rdfs('seeAlso'))

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`Vergunningscontrolerapport ${datasetName}`}</title>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.5.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.5.1/dist/leaflet-src.js"></script>

        <script src="https://unpkg.com/proj4@2.5.0/dist/proj4-src.js"></script>
        <script src="https://unpkg.com/proj4leaflet@1.0.1"></script>

        <script src="https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Cesium.js"></script>

        <link
          href="https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Widgets/widgets.css"
          rel="stylesheet"
        />
        <script src="https://unpkg.com/proj4@2.5.0/dist/proj4-src.js"></script>
        <script src="https://unpkg.com/proj4leaflet@1.0.1"></script>

        <script
          type={'application/json'}
          id="data"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              {
                polygon,
                geoData,
                gltfUrl,
              },
              null,
              2,
            ),
          }}
        ></script>
      </head>
      <body className="p-5">
        <img src="https://www.rotterdam.nl/images/logo-base.svg" style={{ float: 'right' }} />
        <h1>
          Vergunningscontrolerapport <a href={datasetUrl}>{datasetName}</a>
        </h1>
        <dl>
          <dt>Revision</dt>
          <dd>
            <pre>{gitRev.value}</pre>
          </dd>
          <dt>Voetafdruk</dt>
          <dd>
            <a href={footprintUrl}>{footprintUrl}</a>
          </dd>
          <dt>3D model met bestemmingsvlakken</dt>
          <dd>
            <a href="https://demo.triplydb.com/rotterdam/-/queries/3D-Visualisation-with-background-map/">
              https://demo.triplydb.com/rotterdam/-/queries/3D-Visualisation-with-background-map/
            </a>
          </dd>
          <dt>Downloads</dt>
          <dd>
            <div>
              <a href={gltfDownload}>⬇ 3D-model ({gltfDownload.split('fileName=')[1]})</a>
            </div>
            <div>
              <a href={ifc.value.toString()}>⬇ IFC-bestand</a>
            </div>
            {idsFiles.map((f) => (
              <div key={f.value}>
                <a href={f.value.toString()}>⬇ IDS-controle ({f.value.toString().split('fileName=')[1]})</a>
              </div>
            ))}
          </dd>
        </dl>

        {/* TODO restore this when time is ripe <div style={{ height: 880 }} id="cesiumContainer"></div> */}

        {controles.map((controle: GrapoiPointer) => Controle(controle, provenance))}

        <script type="module" dangerouslySetInnerHTML={{ __html: inlineScript }}></script>
      </body>
    </html>
  )
}
