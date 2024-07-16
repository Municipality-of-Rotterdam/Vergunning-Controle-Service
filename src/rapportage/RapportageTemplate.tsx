import grapoi from 'grapoi'
import { readFile } from 'fs/promises'
import { rpt, rdfs, prov, dct, skos } from '@helpers/namespaces.js'
import { GrapoiPointer } from '@root/core/helpers/grapoi.js'
import { Store as TriplyStore } from '@triplydb/data-factory'
import { key } from '@triplyetl/etl/generic'
import { a } from '@triplyetl/etl/vocab'
import React from 'react'
// import { Marker, Popup, MapContainer, TileLayer } from 'react-leaflet'
// import { useMap } from 'react-leaflet/hooks'

export type RapportageProps = {
  baseIRI: string
  datasetName: string
  elongation: number
  footprintUrl: string
  gebouw: string
  gebouwAddress: string
  gltfDownload: string
  glbDownload: string
  polygon: any
}

const inlineScript = await readFile('./src/rapportage/inlineScript.js')

function Bestemmingsplan(source: GrapoiPointer) {
  const naam = source.out(skos('prefLabel'))
  const id = source.out(rdfs('label'))
  const url = source.out(rdfs('seeAlso'))
  if (url && url.value) {
    return (
      <a href={url.value.toString()}>
        {naam.value} ({id.value})
      </a>
    )
  } else {
    return 'n.v.t.'
  }
}

function ElongationExplanation() {
  return (
    <details>
      <summary>Uitleg</summary>
      <p>
        De langwerpigheid van de voetafdruk van het gebouw wordt uitgedrukt in het getal L. L wordt bepaald aan de hand
        van de verhouding tussen oppervlakte en omtrek van de voetafdruk, en is onafhankelijk van de vorm van de
        voetafdruk. Hieronder een overzicht van waarden voor L voor rechthoeken met oplopende langwerpigheid:
      </p>
      <div className="elongation-example">
        <table>
          <tr>
            <td></td>
            <td>L=1</td>
          </tr>
        </table>
      </div>

      <div className="elongation-example">
        <table>
          <tr>
            <td></td>
            <td></td>
            <td>L=0,9428</td>
          </tr>
        </table>
      </div>

      <div className="elongation-example">
        <table>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td>L=0,8660</td>
          </tr>
        </table>
      </div>

      <div className="elongation-example">
        <table>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>L=0,7454</td>
          </tr>
        </table>
      </div>

      <div className="elongation-example">
        <table>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>L=0,5750</td>
          </tr>
        </table>
      </div>
    </details>
  )
}

function ProvenanceHtml(provenancePointer: GrapoiPointer) {
  const parts = provenancePointer.out(dct('hasPart'))
  const startTime = provenancePointer.out(prov('startedAtTime')).value
  const endTime = provenancePointer.out(prov('endedAtTime')).value
  const sparqlUrl = provenancePointer.out(rpt('sparqlUrl')).value
  const apiResponse = provenancePointer.out(rpt('apiResponse')).value
  const apiCall = provenancePointer.out(rpt('apiCall')).value
  const prefLabel = provenancePointer.out(skos('prefLabel')).value
  const description = provenancePointer.out(dct('description')).value
  return (
    <details key={provenancePointer.value}>
      <summary>{prefLabel ?? provenancePointer.value}</summary>
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
              <a href={typeof apiCall == 'number' ? 'about:blank' : apiCall}>{apiCall}</a>
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
              <a href={typeof sparqlUrl == 'number' ? 'about:blank' : sparqlUrl}>{sparqlUrl}</a>
            </dd>
          </>
        )}
      </dl>
      {parts.map((part: GrapoiPointer) => ProvenanceHtml(part))}
    </details>
  )
}

function Controle(controle: any, provenanceDataset: TriplyStore) {
  const label = controle.out(rdfs('label')).value
  const validated = controle.out(rpt('passed')).value === 'true'
  const message = controle.out(rpt('message')).value
  const verwijzing = controle.out(rpt('verwijzing')).value
  const elongation = controle.out(rpt('elongation')).value
  const description = controle.out(dct('description')).value
  const provenanceNode = controle.out(prov('wasGeneratedBy'))
  const provenanceNodeInProvenance = grapoi({ dataset: provenanceDataset, term: provenanceNode.term })
  const source = controle.out(dct('source'))
  return (
    <div key={label}>
      <hr />
      <h3 className={!validated ? 'bg-danger-subtle' : ''}>{label}</h3>
      <div id={`map_${label}`} style={{ height: '180px' }}></div>
      <script
        dangerouslySetInnerHTML={{
          __html: `var map = L.map('map_${label}').setView([51.505, -0.09], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

L.marker([51.5, -0.09]).addTo(map)
    .bindPopup('A pretty CSS popup.<br> Easily customizable.')
    .openPopup();`,
        }}
      ></script>
      <dl>
        <dt>Beschrijving</dt>
        <dd>{description}</dd>
        <dt>Resultaat</dt>
        <dd className="result">
          {validated ? <strong>✅</strong> : <strong>❌</strong>} <span dangerouslySetInnerHTML={{ __html: message }} />
          {elongation ? ElongationExplanation() : ''}
        </dd>
        <dt>Bestemmingsplan</dt>
        <dd>{Bestemmingsplan(source)}</dd>
        {verwijzing ? (
          <>
            <dt>Verwijzing</dt>
            <dd>{verwijzing}</dd>
          </>
        ) : (
          ''
        )}
        <dt>Provenance</dt>
        <dd className="provenance">{ProvenanceHtml(provenanceNodeInProvenance)}</dd>
      </dl>
    </div>
  )
}

export default function (
  {
    gebouw,
    polygon,
    footprintUrl,
    datasetName,
    baseIRI,
    gltfDownload,
    glbDownload,
    gebouwAddress,
    elongation,
  }: RapportageProps,
  validationPointer: GrapoiPointer,
  provenanceDataset: TriplyStore,
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
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossOrigin=""
        ></script>

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
              },
              null,
              2,
            ),
          }}
        ></script>
        <style>{`
.elongation-example table {
  border-collapse: collapse;
  margin: 5px 3px;
}
.elongation-example td {
  width: 35px;
  height: 35px;
  border-left: 1px dashed grey;
  border-top: 2px solid black;
  border-bottom: 2px solid black;
}
.elongation-example td:first-child {
  border-left: 2px solid black;
}
.elongation-example td:last-child {
  border-left: 2px solid black;
  border-top: none;
  border-bottom: none;
  padding-left: 10px;
}
`}</style>
      </head>
      <body className="p-5">
        <img src="https://www.rotterdam.nl/images/logo-base.svg" style={{ float: 'right' }} />
        <h1>Vergunningscontrolerapport</h1>
        <dl>
          <dt>Revision</dt>
          <dd>
            <pre>{gitRev.value}</pre>
          </dd>
          <dt>Adres</dt>
          <dd>{gebouwAddress}</dd>
          <dt>Dataset</dt>
          <dd>
            <a href={baseIRI} target="_blank">
              {baseIRI}
            </a>
          </dd>
          <dt>Voetafdruk</dt>
          <dd>
            <a href={footprintUrl} target="_blank">
              {footprintUrl}
            </a>
          </dd>
          <dt>3D model met bestemmingsvlakken</dt>
          <dd>
            <a
              href="https://demo.triplydb.com/rotterdam/-/queries/3D-Visualisation-with-background-map"
              target="_blank"
            >
              https://demo.triplydb.com/rotterdam/-/queries/3D-Visualisation-with-background-map
            </a>
          </dd>
          <dt>Downloads</dt>
          <dd>
            <div>
              Alle assets:{' '}
              <a href={baseIRI + '/Assets'} target="_blank">
                {baseIRI}Assets
              </a>
            </div>
            <div>
              ⬇ 3D-model: <a href={gltfDownload}>{gltfDownload.split('fileName=')[1]}</a>{' '}
              <a href={glbDownload}>{glbDownload.split('fileName=')[1]}</a>
            </div>
            <div>
              ⬇ IFC-bestand: <a href={ifc.value.toString()}>{ifc.value.toString().split('fileName=')[1]}</a>
            </div>
            ⬇ IDS-controle:
            {idsFiles.map((file) => (
              <React.Fragment key={file.value}>
                {' '}
                <a href={file.value.toString()}>{file.value.toString().split('fileName=')[1]}</a>
              </React.Fragment>
            ))}
          </dd>
        </dl>

        {/* TODO restore this when time is ripe <div style={{ height: 880 }} id="cesiumContainer"></div> */}

        {controles.map((controle: GrapoiPointer) => Controle(controle, provenanceDataset))}

        <script type="module" dangerouslySetInnerHTML={{ __html: inlineScript }}></script>
      </body>
    </html>
  )
}
