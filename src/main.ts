import { Etl, Source, toTriplyDb } from '@triplyetl/etl/generic'
import { validate } from '@triplyetl/etl/shacl'
import { source, destination } from './utils/sources-destinations.js'
import { baseIri, graph } from './utils/declarations.js'
import { ruleIdShaclConstraintDictionary, vcsEtl, vcsGenerateShacl } from './VCS/VcsEtl.js'

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri, defaultGraph: baseIri.concat('default') })
  etl.use(
    await vcsEtl('src/VCS/data/Kievitsweg_R23_MVP_IFC4.ifc', 'src/VCS/data/IDS_Rotterdam_BIM.ids', {baseIRI: 'https://www.roterdam.nl/vcs/graph/'}),
    await vcsGenerateShacl(ruleIdShaclConstraintDictionary),
    validate(Source.file('./data/constraintModel.ttl'),
      {
        graph: graph.concat('report'),
        terminateOn: 'Never'
      }
    ),
    toTriplyDb(destination.vergunningscontroleservice)
  )
  await etl.copySource(source.model, destination.vergunningscontroleservice)
  return etl
}
