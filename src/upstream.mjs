import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

export const gitBlobHash = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex')

export function verifySnapshot(source, entries) {
    const root = path.resolve(source), missing = [], changed = [], groups = {}
    for (const entry of entries) {
        const relative = entry.path
        if (typeof relative !== 'string' || path.posix.normalize(relative) !== relative || relative.startsWith('../') || path.isAbsolute(relative) || relative.includes('\\')) throw new Error('Invalid upstream member path')
        const file = path.resolve(root, relative)
        if (!fs.existsSync(file)) { missing.push(relative); continue }
        const stat = fs.lstatSync(file)
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Upstream member is not a regular file: ' + relative)
        const bytes = fs.readFileSync(file)
        if (gitBlobHash(bytes) !== entry.sha) changed.push(relative)
        const group = relative.includes('/') ? relative.split('/')[0] : '(root)'
        groups[group] ??= { files: 0, bytes: 0 }
        groups[group].files++; groups[group].bytes += bytes.length
    }
    if (missing.length || changed.length) throw new Error(JSON.stringify({ error: 'Upstream integrity mismatch', missing, changed }))
    return { checked: entries.length, missing, changed, groups, upstreamUnmodified: true }
}

export function loadUpstream(toolRoot) {
    const lock = JSON.parse(fs.readFileSync(path.join(toolRoot, 'upstream.lock.json'), 'utf8'))
    if (lock.version !== 1 || lock.repository !== 'adunext/adu-motion-video' || !/^[a-f0-9]{40}$/.test(lock.commit) || lock.root !== 'upstream/adu-motion-video' || !Array.isArray(lock.files) || lock.files.length === 0) throw new Error('Invalid upstream lock')
    const source = path.join(toolRoot, lock.root)
    return { source, lock, verification: verifySnapshot(source, lock.files) }
}

export function pythonExecutable() {
    return process.env.VIDEO_GENERATOR_PYTHON ?? 'python'
}

export function runUpstream(toolRoot, args, options = {}) {
    const { source, lock } = loadUpstream(toolRoot)
    const entry = options.entry ?? 'scripts/pipeline.py'
    if (!['scripts/pipeline.py', 'scripts/verify_delivery.py'].includes(entry)) throw new Error('Unsupported internal upstream entry')
    const result = spawnSync(pythonExecutable(), ['-X', 'utf8', path.join(source, entry), ...args], {
        cwd: options.cwd ?? process.cwd(), stdio: options.stdio ?? 'inherit', encoding: 'utf8',
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1', ...options.env },
        maxBuffer: 16 * 1024 * 1024, shell: false
    })
    if (result.error) throw new Error('Upstream Python unavailable: ' + result.error.message)
    verifySnapshot(source, lock.files)
    return result
}