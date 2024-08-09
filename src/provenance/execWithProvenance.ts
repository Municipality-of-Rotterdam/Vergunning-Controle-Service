import { exec } from 'node:child_process'

import dataFactory from '@rdfjs/data-model'

import { prov, rdf, rdfs, xsd } from '../namespaces.js'
import { provenancePointer } from './provenance.js'

export const execWithProvenance = async (command: string): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const startTime = performance.now()

    exec(command, (error, stdout, stderr) => {
      const endTime = performance.now()

      provenancePointer.addOut(prov('activity'), (activity: any) => {
        activity.addOut(rdfs('label'), dataFactory.literal(command))
        activity.addOut(rdf('type'), prov('Activity'))
        activity.addOut(rdf('type'), prov('ExecActivity'))
        activity.addOut(prov('startTime'), dataFactory.literal(startTime.toString(), xsd('double')))
        activity.addOut(prov('endTime'), dataFactory.literal(endTime.toString(), xsd('double')))
        if (error) activity.addOut(prov('error'), dataFactory.literal(error.message))
        if (stdout) activity.addOut(prov('stdout'), dataFactory.literal(stdout))
        if (stderr) activity.addOut(prov('stderr'), dataFactory.literal(stderr))
      })

      error ? reject(error) : resolve({ stdout, stderr })
    })
  })
}
