import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifySnapshot } from '../src/upstream.mjs'

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [source, inventoryFile] = process.argv.slice(2)
if (!source || !inventoryFile) throw new Error('Supply reviewed snapshot directory and GitHub inventory.json')
const inventory = JSON.parse(fs.readFileSync(path.resolve(inventoryFile), 'utf8'))
if (inventory.repository !== 'adunext/adu-motion-video' || inventory.truncated !== false) throw new Error('A complete reviewed upstream inventory is required')
const entries = inventory.tree.filter(entry => entry.type === 'blob').map(entry => ({ path: entry.path, size: entry.size, sha: entry.sha }))
verifySnapshot(path.resolve(source), entries)
const destination = path.join(toolRoot, 'upstream/adu-motion-video')
if (fs.existsSync(destination) || fs.existsSync(path.join(toolRoot, 'upstream.lock.json'))) throw new Error('Upstream baseline already exists; use an explicit reviewed upgrade')
fs.mkdirSync(path.dirname(destination), { recursive: true })
fs.cpSync(path.resolve(source), destination, { recursive: true, errorOnExist: true, force: false })
const verification = verifySnapshot(destination, entries)
const lock = { version: 1, repository: inventory.repository, url: 'https://github.com/adunext/adu-motion-video', commit: inventory.sha, root: 'upstream/adu-motion-video', license: 'MIT; third-party assets retain separate notices', files: entries }
fs.writeFileSync(path.join(toolRoot, 'upstream.lock.json'), JSON.stringify(lock, null, 2), { flag: 'wx' })
fs.mkdirSync(path.join(toolRoot, 'sessions'), { recursive: true })
fs.writeFileSync(path.join(toolRoot, 'sessions/upstream-preservation.json'), JSON.stringify({ ...verification, repository: lock.repository, commit: lock.commit, source: path.resolve(source), destination, removedFiles: [], modifiedUpstreamFiles: [] }, null, 2), { flag: 'wx' })
console.log(JSON.stringify({ destination, commit: lock.commit, preservedFiles: entries.length, removedFiles: 0, modifiedUpstreamFiles: 0, groups: verification.groups }))