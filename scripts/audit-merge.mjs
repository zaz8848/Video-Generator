import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { loadUpstream } from '../src/upstream.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const upstream = loadUpstream(root)
const packDirectory = path.join(upstream.source, 'packs')
const packFamilies = fs.readdirSync(packDirectory, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
const originalCommands = fs.readFileSync(path.join(upstream.source, 'scripts/pipeline.py'), 'utf8')
const commands = [...originalCommands.matchAll(/'([a-z]+(?:-[a-z]+)+)'/g)].map(match => match[1])
const ledger = {
    schema: 'video-generator-merge-assets/1',
    toolVersion: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version,
    repository: upstream.lock.repository, upstreamCommit: upstream.lock.commit,
    preservedFiles: upstream.verification.checked, deletedUpstreamFiles: [], modifiedUpstreamFiles: [],
    groups: upstream.verification.groups, packFamilies, commandAccess: 'All pipeline commands forwarded unchanged through cli adu; no command-name whitelist',
    commandNamesObserved: [...new Set(commands)].sort(),
    files: upstream.lock.files.map(entry => ({ path: entry.path, bytes: fs.statSync(path.join(upstream.source, entry.path)).size, gitBlobSha: entry.sha, action: 'retained-byte-identical' })),
    additions: ['src/upstream.mjs', 'src/presenter.mjs', 'src/product.mjs', 'extensions/product-runtime.js', 'test/upstream.test.mjs', 'test/presenter.test.mjs', 'test/product.test.mjs', 'scripts/vendor-upstream.mjs', 'scripts/audit-merge.mjs'],
    retainedLocalCompatibility: ['src/media.mjs', 'src/schema.mjs', 'templates/project.json', 'test/media.test.mjs', 'scripts/tts.mjs'],
    decisions: [
        { item: 'Local 0.1 renderer', action: 'retained; no longer the default upstream/product integration path' },
        { item: 'Implicit short-music looping', action: 'retained only in legacy CLI; rejected by new product adapter; upstream policy unmodified' },
        { item: 'Hardcoded AEON brand/media/voice', action: 'not imported; remains in original consuming project' },
        { item: 'Upstream demo media, fonts and brand', action: 'retained with notices; preservation is not a new reuse license' }
    ],
    notClaimed: ['Every pack/version visually verified on Windows', 'Real-person lip-sync/face tracking acceptance', 'Real TTS cloud call this merge', 'MotionGit personal .motion import or universal runtime', 'Agent Plugin installation', 'Existing AEON film migrated']
}
const target = path.join(root, 'docs/upstream-assets.json')
fs.writeFileSync(target, JSON.stringify(ledger, null, 2))
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')
console.log(JSON.stringify({ ledger: target, sha256, preservedFiles: ledger.preservedFiles, deletedFiles: 0, modifiedUpstreamFiles: 0, packFamilies: packFamilies.length, groups: ledger.groups }))