import { controles } from '@core/controles.js'
import { init } from '@core/init/init.js'
import { ifcConversion } from '@core/maakLinkedData.js'
import { upload } from '@core/upload.js'
import { valideer } from '@core/valideer.js'
import { idsControle } from '@core/ids.js'
import { verrijk } from '@core/verrijkingen.js'
import { rapportage } from '@root/rapportage/rapportage.js'
import { useDebugValue } from 'react'
import { Activity } from '@core/Activity.js'
import { StepContext } from '@core/executeSteps.js'
import { Store as TriplyStore } from '@triplydb/data-factory'

await new Activity(
  { name: 'Vergunningscontroleservice' },
  async (ctx: any) => {
    //return init.perform({})
    return ctx
  },
  [init, idsControle, ifcConversion, verrijk, upload, controles, valideer, rapportage],
).run({ provenanceDataset: new TriplyStore() } as StepContext)
