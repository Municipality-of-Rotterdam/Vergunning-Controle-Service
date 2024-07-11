# Hoe voeg je een verrijking toe

- Maak een nieuw bestand in `./src/verrijkingen`.
- Start met de volgende template:

```TypeScript
import { StepContext } from '@root/core/executeSteps.js'
import factory from '@rdfjs/data-model'
import { rdfs } from '@helpers/namespaces.js'

const log = createLogger('verrijking', import.meta)

export default async function JouwVerrijking({
  focusedDataset
  verrijkingenDataset,
}: Pick<StepContext, 'focusedDataset' | 'verrijkingenDataset'>) {

  log(`Starten van tag creatie`, 'JouwVerrijking')

  const tag = 'Mijn extra tag'

  const quad = factory.quad(
    subject, // buiten de scope van deze example, kijk in voetprint.ts
    rdfs('label'),
    factory.literal(tag),
  )

  verrijkingenDataset.add(quad as any)
  log(`Tag toegevoegd aan de verrijkingen dataset`, 'JouwVerrijking')

  return {
    tag,
  }
}

```

- Het bestand wordt automatisch toevoegt.
- tag (van het return object) is nu ook te gebruiken in het rapport of andere methodes die de context krijgen.
