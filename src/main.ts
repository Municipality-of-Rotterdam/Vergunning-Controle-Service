import { execWithProvenance } from './provenance/execWithProvenance.js'
import { fetchWithProvenance } from './provenance/fetchWithProvenance.js'
import { printProvenance, setPhase } from './provenance/provenance.js'

console.log('A fresh start.')

try {
  setPhase('Getting first fetch')
  const response = await fetchWithProvenance('http://example.com/test')
  const html = await response.text()
  // console.log(html)

  setPhase('Getting second fetch')
  const response2 = await fetchWithProvenance('http://example.com')
  const json = await response2.json()
  // console.log(json)
} catch (error) {}

setPhase('Executing ls -la')
const { stdout, stderr } = await execWithProvenance('ls -la')
console.log(stdout, stderr)

await printProvenance()
