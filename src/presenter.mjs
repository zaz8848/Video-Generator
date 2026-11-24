import fs from 'node:fs'
import path from 'node:path'
import { loadUpstream, runUpstream } from './upstream.mjs'

export function createPresenterProject(toolRoot, destination) {
    const project = path.resolve(destination)
    if (fs.existsSync(project)) throw new Error('Refusing to overwrite an existing presenter project')
    try {
        fs.lstatSync(project)
        throw new Error('Refusing to overwrite an existing presenter project')
    } catch (error) {
        if (error.code !== 'ENOENT') throw error
    }
    const before = loadUpstream(toolRoot)
    const result = runUpstream(toolRoot, ['new', project], { stdio: 'pipe' })
    if (result.status !== 0) throw new Error('Upstream presenter creation failed: ' + (result.stderr || result.stdout || result.signal || result.status))
    const mapping = path.join(project, 'talkmap.js')
    const changes = []
    const stat = fs.lstatSync(mapping)
    if (stat.isFile() && !stat.isSymbolicLink()) {
        const bytes = fs.readFileSync(mapping)
        for (const newline of ['\n', '\r\n']) {
            const original = Buffer.from('// Optional data absent.' + newline)
            if (!bytes.equals(original)) continue
            const replacement = Buffer.from('// Optional data absent. Generated data may replace this stub.' + newline)
            fs.writeFileSync(mapping, replacement)
            changes.push({ file: 'talkmap.js', from: original.toString(), to: replacement.toString(), reason: 'Upstream new emits a short empty stub; import accepts only the generated-data stub.' })
            break
        }
    }
    const after = loadUpstream(toolRoot)
    const addedNotices = []
    for (const [source, name] of [['LICENSE', 'ADU-LICENSE.txt'], ['THIRD_PARTY.md', 'ADU-THIRD-PARTY.md']]) {
        fs.copyFileSync(path.join(before.source, source), path.join(project, name), fs.constants.COPYFILE_EXCL)
        addedNotices.push(name)
    }
    const compatibility = {
        schema: 'video-generator-presenter-compatibility/1',
        upstreamCommit: before.lock.commit,
        upstreamFilesChecked: after.verification.checked,
        upstreamFilesUnchanged: after.verification.upstreamUnmodified,
        scope: 'Only this newly created project; no upstream or existing project changes.',
        changes, addedNotices
    }
    fs.writeFileSync(path.join(project, 'presenter-compatibility.json'), JSON.stringify(compatibility, null, 2) + '\n', { flag: 'wx' })
    return { project, scenario: 'presenter', compatibilityUpstreamFilesUnchanged: compatibility.upstreamFilesUnchanged, compatibility }
}