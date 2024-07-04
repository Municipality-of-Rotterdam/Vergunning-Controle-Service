import { controles } from '@core/controles.js'
import { executeSteps } from '@core/executeSteps.js'
import { init } from '@core/init/init.js'
import { maakLinkedData } from '@core/init/maakLinkedData.js'
import { upload } from '@core/upload.js'
import { valideer } from '@core/valideer.js'
import { idsControle } from '@core/ids.js'
import { verrijk } from '@core/verrijkingen.js'
import { rapportage } from '@root/rapportage/rapportage.js'

// TODO IDS nog uitvoeren voordat alles draait.

await executeSteps([
  ['Initialisatie', init],
  ['IDS controle', idsControle],
  ['Linked data', maakLinkedData],
  ['Verrijkingen', verrijk],
  ['Opslaan naar TriplyDB database', upload],
  ['Controles voorbereiden', controles],
  ['Controles uitvoeren', valideer],
  ['Rapportage', rapportage],
])
