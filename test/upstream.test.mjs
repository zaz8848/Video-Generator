import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { gitBlobHash, loadUpstream, verifySnapshot } from '../src/upstream.mjs'

const tool = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('all upstream assets remain byte-identical, including historical packs, tests and licenses', () => {
    const upstream = loadUpstream(tool)
    assert.equal(upstream.lock.commit, '4a52ae2cff542cfb0bfcf6e93e5120c55d0110cf')
    assert.equal(upstream.verification.checked, 1042)
    for (const [group, count] of [['packs', 699], ['tests', 61], ['assets', 48], ['scripts', 62], ['adapters', 34], ['adaptation-profiles', 22], ['third-party', 3]]) assert.equal(upstream.verification.groups[group].files, count)
    for (const name of ['LICENSE', 'THIRD_PARTY.md', 'SKILL.md', 'AGENTS.md', 'requirements-runtime.txt']) assert(upstream.lock.files.some(file => file.path === name))
})

test('asset integrity detects missing or altered files without modifying upstream', () => {
    const root = path.join(tool, 'sessions', 'integrity-' + Date.now())
    fs.mkdirSync(root, { recursive: true })
    const original = Buffer.from('retained asset\n'), file = path.join(root, 'asset.txt')
    fs.writeFileSync(file, original)
    const entries = [{ path: 'asset.txt', sha: gitBlobHash(original) }]
    assert.equal(verifySnapshot(root, entries).checked, 1)
    fs.writeFileSync(file, 'changed')
    assert.throws(() => verifySnapshot(root, entries), /integrity mismatch/)
    fs.unlinkSync(file)
    assert.throws(() => verifySnapshot(root, entries), /integrity mismatch/)
    assert.throws(() => verifySnapshot(root, [{ path: '../escape', sha: '' }]), /Invalid upstream/)
})

test('CLI retains the complete upstream command family and full catalog access', () => {
    const cli = path.join(tool, 'src/cli.mjs')
    const invoke = args => spawnSync(process.execPath, [cli, 'adu', ...args], { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, maxBuffer: 8 * 1024 * 1024 })
    const help = invoke(['--help'])
    assert.equal(help.status, 0, help.stderr)
    for (const command of ['macro-plan', 'macro-build', 'auto-plan', 'auto-build', 'macro-rematch', 'macro-apply-rematch', 'preview', 'repair-plan', 'repair-apply', 'render', 'mix', 'stills']) assert(help.stdout.includes(command), command)
    const catalog = invoke(['packs'])
    assert.equal(catalog.status, 0, catalog.stderr)
    for (const name of ['classic-performance', 'continuous-performance', 'paper-balance', 'paper-ball-performance', 'stage-performance', 'editorial-performance', 'kinetic-performance', 'vivid-sticker-performance', 'vibrant-color-performance']) assert(catalog.stdout.includes(name), name)
    assert.equal(loadUpstream(tool).verification.checked, 1042)
})