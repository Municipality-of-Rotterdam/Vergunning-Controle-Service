import { exec } from 'child_process'

import { createLogger } from './logger.js'

export const createExecutor =
  (component: string, meta: ImportMeta, subComponent?: string) =>
  async (command: string): Promise<string> => {
    const log = createLogger(component, meta, subComponent)

    const root = import.meta.url.replaceAll('/src/helpers/executeCommand.ts', '').replaceAll('file://', '')
    // const cleanedCommand = command.replaceAll(root, '.')
    // log(`Executing ${cleanedCommand}`)

    return new Promise((resolve, reject) => {
      const child = exec(command)

      const output: string[] = []

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          output.push(data)
        })
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          if (
            [
              'https://www.slf4j.org/codes.html#noProviders',
              'No SLF4J providers were found',
              'read files /pset',
              'rsrc:./',
              'Property sets',
              "Running pip as the 'root' user",
              'notice',
            ].some((warningString) => data.includes(warningString))
          ) {
          } else {
            reject(new Error(`stderr: ${data}`))
          }
        })
      }

      child.on('close', (code) => {
        if (code !== 0) {
          // log(`Command "${command}" exited with code ${code}`)
          reject(new Error(`Command "${command}" exited with code ${code}`))
        } else {
          resolve(output.join('\n'))
        }
      })

      child.on('error', (err) => {
        log(`Error executing the command: "${command}"\n\n${err}`)
        reject(new Error(`Error executing the command: "${command}"\n\n${err}`))
      })
    })
  }
