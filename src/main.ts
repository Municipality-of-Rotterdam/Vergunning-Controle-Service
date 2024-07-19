import { init } from '@core/init/init.js'
import { linkedData } from '@core/maakLinkedData.js'
import { upload } from '@core/upload.js'
import { valideer } from '@core/valideer.js'
import { idsControle } from '@core/ids.js'
import { verrijk } from '@core/verrijkingen.js'
import { rapport } from '@root/rapportage/rapportage.js'
import { ActivityGroup, Activity } from '@core/Activity.js'
import { StepContext } from '@core/executeSteps.js'

const pipeline = new ActivityGroup({ name: 'Vergunningscontroleservice' }, [
  init,
  idsControle,
  linkedData,
  verrijk,
  upload,
  valideer,
  rapport,
])

await pipeline.run({} as StepContext)
