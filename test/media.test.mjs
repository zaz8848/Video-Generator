import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { validateSchema } from '../src/schema.mjs'
import { contain, loadProject, projectPath, render, probe, run, hash, subtitleText } from '../src/media.mjs'

const tool = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const parent = path.join(tool, 'sessions', 'tests-' + Date.now())
fs.mkdirSync(parent, { recursive: true })
const template = JSON.parse(fs.readFileSync(path.join(tool, 'templates/project.json'), 'utf8'))

test('schema and complete contain bounds', () => {
    assert.throws(() => validateSchema({ ...template, width: 321 }), /Invalid project/)
    assert.throws(() => validateSchema({ ...template, unknown: true }), /Invalid project/)
    assert.throws(() => validateSchema({ ...template, inset: 600 }))
    for (const [width, height] of [[2000, 1500], [1080, 1920], [40, 20]]) {
        const bounds = contain(width, height, { width: 640, height: 480, inset: 24, captionBand: 64 })
        assert(bounds.x >= 24); assert(bounds.y >= 24)
        assert(bounds.x + bounds.width <= 640 - 24)
        assert(bounds.y + bounds.height <= 480 - 24 - 64)
        assert(bounds.ratio <= 1)
    }
    assert(!subtitleText('{\\pos(1,2)}unsafe').includes('{'))
    assert(!subtitleText('{\\pos(1,2)}unsafe').includes('\\pos'))
})

test('relative project isolation and schema errors', () => {
    assert.throws(() => projectPath(parent, '../escape.mp4'), /outside/)
    assert.throws(() => projectPath(parent, path.resolve(parent, 'escape.mp4')), /relative/)
    const file = path.join(parent, 'invalid.json')
    fs.writeFileSync(file, JSON.stringify({ ...template, clips: [{ mode: 'play', source: 'missing.mp4', duration: 1 }] }))
    assert.throws(() => loadProject(file), /Missing input/)
})

test('CLI initialization from another cwd and image-only silent film', () => {
    const root = path.join(parent, 'third-project')
    const invoke = (...args) => spawnSync(process.execPath, [path.join(tool, 'src/cli.mjs'), ...args], { cwd: parent, encoding: 'utf8' })
    const init = invoke('init', root)
    assert.equal(init.status, 0, init.stderr)
    assert.equal(invoke('init', root).status, 1)
    run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'color=c=green:size=80x60', '-frames:v', '1', path.join(root, 'assets/still.png')])
    const plan = { ...template, width: 320, height: 240, fps: 10, clips: [{ mode: 'image', source: 'assets/still.png', duration: 0.3 }] }
    const manifest = path.join(root, 'project.json')
    fs.writeFileSync(manifest, JSON.stringify(plan))
    const validated = invoke('validate', manifest)
    assert.equal(validated.status, 0, validated.stderr)
    const rendered = invoke('render', manifest)
    assert.equal(rendered.status, 0, rendered.stderr)
    const report = JSON.parse(rendered.stdout)
    assert.equal(report.decodedFrames, 3)
    assert.equal(report.narrationClips, 0)
    assert.equal(report.music, false)
    assert.equal(invoke('verify', manifest).status, 0)
    assert.equal(invoke('render', manifest).status, 1)
})

test('two independent projects: play, freeze, resume, captions, music, rejection gates', () => {
    const results = []
    for (const [index, size] of [[0, [320, 240]], [1, [640, 480]]]) {
        const root = path.join(parent, `项目 ${index}`), assets = path.join(root, 'assets')
        fs.mkdirSync(assets, { recursive: true })
        run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=240x160:rate=10', '-t', '2', '-c:v', 'ffv1', path.join(assets, 'source.mkv')])
        run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=24000', '-t', '0.4', path.join(assets, 'voice.wav')])
        run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'sine=frequency=120:sample_rate=48000', '-t', '0.3', path.join(assets, 'music.wav')])
        fs.writeFileSync(path.join(assets, 'voice.json'), JSON.stringify({ fixture: 'synthetic contract probe; not a TTS service response', successCode: 20000000, sha256: hash(path.join(assets, 'voice.wav')), captions: [{ start: 0, end: 0.35, text: 'Synthetic caption' }] }))
        fs.writeFileSync(path.join(assets, 'license.json'), JSON.stringify({ sha256: hash(path.join(assets, 'music.wav')), sourceUrl: 'https://example.invalid/synthetic-test-tone', usage: 'generated test signal; not third party music', approved: true }))
        const plan = {
            ...template, width: size[0], height: size[1], fps: 10, clips: [
                { mode: 'play', source: 'assets/source.mkv', in: 0, duration: 0.5 },
                { mode: 'freeze', source: 'assets/source.mkv', in: 0.5, duration: 0.5 },
                { mode: 'play', source: 'assets/source.mkv', in: 0.5, duration: 0.5 }
            ], narration: [{ source: 'assets/voice.wav', at: 0.5, metadata: 'assets/voice.json' }], music: { source: 'assets/music.wav', license: 'assets/license.json' }
        }
        const manifest = path.join(root, 'project.json')
        fs.writeFileSync(manifest, JSON.stringify(plan))
        const project = loadProject(manifest), report = render(project)
        assert.equal(report.fullDecode, true)
        assert.equal(report.inputsUnchanged, true)
        assert.equal(report.subtitleCount, 1)
        assert.equal(probe(project.output).streams.find(stream => stream.codec_type === 'audio').sample_rate, '48000')
        assert.throws(() => render(project), /overwrite/)
        const bytesBefore = hash(project.output)
        const frame = time => {
            const bounds = project.clips[1].bounds
            const result = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(time), '-i', project.output, '-frames:v', '1', '-vf', `crop=${bounds.width}:${bounds.height}:${bounds.x}:${bounds.y}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 4 * 1024 * 1024 })
            assert.equal(result.status, 0, result.stderr?.toString())
            return result.stdout
        }
        const frozen = frame(0.55), later = frame(0.85)
        let difference = 0
        for (let pixel = 0; pixel < frozen.length; pixel++) difference += Math.abs(frozen[pixel] - later[pixel])
        assert(difference / frozen.length < 2, 'Frozen interval must keep the same image')
        const freezeStart = frame(0.5), resumeStart = frame(1)
        let resumeDifference = 0
        for (let pixel = 0; pixel < freezeStart.length; pixel++) resumeDifference += Math.abs(freezeStart[pixel] - resumeStart[pixel])
        assert(resumeDifference / freezeStart.length < 2, 'Resume must start at the frozen source frame')
        const metadata = JSON.parse(fs.readFileSync(path.join(assets, 'voice.json'), 'utf8'))
        fs.writeFileSync(path.join(assets, 'voice.json'), JSON.stringify({ ...metadata, sha256: 'invalid' }))
        assert.throws(() => loadProject(manifest), /identity mismatch/)
        fs.writeFileSync(path.join(assets, 'voice.json'), JSON.stringify(metadata))
        fs.writeFileSync(manifest, JSON.stringify({ ...plan, narration: [{ source: 'assets/voice.wav', at: 1.4 }] }))
        assert.throws(() => loadProject(manifest), /exceeds film/)
        fs.writeFileSync(manifest, JSON.stringify({ ...plan, clips: [{ mode: 'play', source: 'assets/source.mkv', in: 1.9, duration: 1 }] }))
        assert.throws(() => loadProject(manifest), /exceeds source/)
        assert.equal(bytesBefore, hash(project.output))
        results.push(report)
    }
    fs.writeFileSync(path.join(parent, 'integration-results.json'), JSON.stringify({ syntheticMediaOnly: true, independentProjects: results }, null, 2))
    console.log('Evidence:', path.join(parent, 'integration-results.json'))
})