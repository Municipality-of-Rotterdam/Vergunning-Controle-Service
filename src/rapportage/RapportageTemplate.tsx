import grapoi from 'grapoi'
import { readFile } from 'fs/promises'
import { rpt, rdfs, prov, dct, skos, geo } from '@helpers/namespaces.js'
import { GrapoiPointer } from '@root/core/helpers/grapoi.js'
import { Store as TriplyStore } from '@triplydb/data-factory'
import { key } from '@triplyetl/etl/generic'
import { a } from '@triplyetl/etl/vocab'
import React from 'react'
import { wktToGeoJSON } from '@terraformer/wkt'

export type RapportageProps = {
  baseIRI: string
  datasetName: string
  elongation: number
  footprintUrl: string
  gebouw: string
  gebouwAddress: string
  gltfDownload: string
  glbDownload: string
  footprint: any
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

function Map(label: string, wkt: string) {
  const geoJSON = wktToGeoJSON(wkt.replace(/^<.*>\s/, '').toUpperCase())
  return (
    <>
      <div id={`map_${label}`} style={{ height: '300px', width: '600px', float: 'right' }}></div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
var RD = new L.Proj.CRS(
  'EPSG:28992',
  '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs',
  {
    origin: [-285401.92, 903401.92],
    resolutions: [
      3251.206502413005, 1625.6032512065026, 812.8016256032513, 406.40081280162565, 203.20040640081282,
      101.60020320040641, 50.800101600203206, 25.400050800101603, 12.700025400050801, 6.350012700025401,
      3.1750063500127004, 1.5875031750063502, 0.7937515875031751, 0.39687579375158755, 0.19843789687579377,
      0.09921894843789689, 0.04960947421894844,
    ],
  },
)

var data = JSON.parse(document.getElementById('data').textContent)

var welstandsgebied = {
  "type": "Feature",
  "properties": {
      "name": "Welstandsgebied",
      "show_on_map": true,
      "popupContent": "Welstandsgebied 77: Stempel & strokenbouw",
      "style": {
          weight: 2,
          color: "#999",
          opacity: 1,
          fillColor: "#B0DE5C",
          fillOpacity: 0.8
    },
  },
  "geometry": ${JSON.stringify(geoJSON)}
}

const coords = data.footprint.geometry.coordinates[0][0]
const startView = RD.unproject(L.point(coords[0], coords[1]))
const map = L.map('map_${label}').setView([startView.lat, startView.lng], 20);

const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

function onEachFeature(feature, layer) {
  if (feature.properties && feature.properties.popupContent) {
    layer.bindPopup(feature.properties.popupContent);
  }
}

L.geoJSON([welstandsgebied, data.footprint], {
  coordsToLatLng: (coords) => RD.unproject(L.point(coords[0], coords[1])),
  onEachFeature
}).addTo(map);

`,
        }}
      ></script>
    </>
  )
}

function Controle(controleP: any, provenanceDataset: TriplyStore) {
  const label = controleP.out(rdfs('label')).value
  const validated = controleP.out(rpt('passed')).value === 'true'
  const message = controleP.out(rpt('message')).value
  const verwijzing = controleP.out(rpt('verwijzing')).value
  const elongation = controleP.out(rpt('elongation')).value
  const description = controleP.out(dct('description')).value
  const provenanceNode = controleP.out(prov('wasGeneratedBy'))
  const provenanceNodeInProvenance = grapoi({ dataset: provenanceDataset, term: provenanceNode.term })
  const source = controleP.out(dct('source'))
  const footprint = controleP.out(rpt('footprint')).out(geo('asWKT')).value
  return (
    <div key={label}>
      <hr />
      <h3 className={!validated ? 'bg-danger-subtle' : ''}>{label}</h3>
      {footprint ? Map(label, footprint) : ''}
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
    footprint,
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
  const date = new Date().toISOString().split('T')[0]

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`Vergunningscontrolerapport ${datasetName} van ${date}`}</title>
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
                footprint,
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
        <h1>Vergunningscontrolerapport van {date}</h1>
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
