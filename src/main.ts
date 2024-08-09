import { injectProvenance, printProvenance, setPhase } from './provenance.js'

console.log('A fresh start.')

injectProvenance()

try {
  setPhase('Getting first fetch')
  const response = await fetch('http://example.com/test')
  const html = await response.text()
  // console.log(html)

  setPhase('Getting second fetch')
  const response2 = await fetch('http://example.com')
  const json = await response2.json()
  // console.log(json)
} catch (error) {}

await printProvenance()
