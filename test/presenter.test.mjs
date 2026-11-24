import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createPresenterProject } from '../src/presenter.mjs'
import { loadUpstream, pythonExecutable, runUpstream } from '../src/upstream.mjs'
import { chrome } from '../upstream/adu-motion-video/scripts/chrome.mjs'

const tool = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const hash = file => sha256(fs.readFileSync(file))
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' })

function fingerprints(upstream) {
    return Object.fromEntries(upstream.lock.files.map(entry => [entry.path, hash(path.join(upstream.source, entry.path))]))
}

test('existing presenter destinations are refused without changing their bytes', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presenter-existing-'))
    try {
        const mapping = path.join(root, 'talkmap.js')
        const data = Buffer.from('const USER_DATA = [1, 2, 3];\n')
        fs.writeFileSync(mapping, data)
        assert.throws(() => createPresenterProject(tool, root), /overwrite/)
        assert.deepEqual(fs.readFileSync(mapping), data)
        assert.deepEqual(fs.readdirSync(root), ['talkmap.js'])
        fs.writeFileSync(mapping, '// Optional data absent.\n')
        assert.throws(() => createPresenterProject(tool, root), /overwrite/)
        assert.equal(fs.readFileSync(mapping, 'utf8'), '// Optional data absent.\n')
        const file = path.join(root, 'existing-file')
        fs.writeFileSync(file, 'existing')
        assert.throws(() => createPresenterProject(tool, file), /overwrite/)
        assert.equal(fs.readFileSync(file, 'utf8'), 'existing')
        const empty = path.join(root, 'existing-empty-directory')
        fs.mkdirSync(empty)
        assert.throws(() => createPresenterProject(tool, empty), /overwrite/)
        assert.deepEqual(fs.readdirSync(empty), [])
    } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('synthetic contract probe: native presenter new/import/export preserves audio and all upstream bytes', { timeout: 240000 }, context => {
    const pythonOverride = process.env.VIDEO_GENERATOR_PYTHON
    delete process.env.VIDEO_GENERATOR_PYTHON
    context.after(() => {
        if (pythonOverride === undefined) delete process.env.VIDEO_GENERATOR_PYTHON
        else process.env.VIDEO_GENERATOR_PYTHON = pythonOverride
    })
    const before = loadUpstream(tool)
    assert.equal(before.verification.checked, 1042)
    const upstreamHashes = fingerprints(before)
    const sessions = path.join(tool, 'sessions')
    fs.mkdirSync(sessions, { recursive: true })
    const root = fs.mkdtempSync(path.join(sessions, 'presenter-contract-'))
    const commands = []
    const environment = { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1' }
    delete environment.ADU_PLAYWRIGHT_MODULE
    const execute = (command, args, options = {}) => {
        commands.push({ command, args: args.map(String) })
        const result = spawnSync(command, args, { cwd: tool, env: environment, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120000, ...options })
        assert.ifError(result.error)
        assert.equal(result.status, 0, `${command}: ${result.stderr?.toString()}\n${result.stdout?.toString()}`)
        return result.stdout
    }
    const probe = file => JSON.parse(execute('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]))
    const pythonVersion = execute(pythonExecutable(), ['--version']).trim()
    const input = path.join(root, 'synthetic-input.mp4')
    execute('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=160x240:rate=10', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '1.2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', input])
    const inputHash = hash(input)
    const inputProbe = probe(input)
    const project = path.join(root, 'native presenter project')
    let evidence
    try {
        const created = createPresenterProject(tool, project)
        commands.push({ wrapper: 'createPresenterProject', upstream: ['new', project] })
        assert.equal(created.project, project)
        assert.equal(created.scenario, 'presenter')
        assert.equal(created.compatibilityUpstreamFilesUnchanged, true)
        assert.deepEqual(JSON.parse(JSON.stringify(created)), created)
        const compatibility = json(path.join(project, 'presenter-compatibility.json'))
        assert.deepEqual(compatibility, created.compatibility)
        assert.equal(compatibility.upstreamFilesChecked, 1042)
        assert.equal(compatibility.changes.length, 1)
        assert.equal(compatibility.changes[0].file, 'talkmap.js')
        assert.match(compatibility.changes[0].from, /^\/\/ Optional data absent\.\r?\n$/)
        assert.equal(fs.readFileSync(path.join(project, 'talkmap.js'), 'utf8'), compatibility.changes[0].to)
        for (const name of ['main.js', 'lib.js', 'templates.js', 'subtitles.js', 'config.js', 'scenes.js', 'index.html', 'audio.py']) {
            assert.equal(hash(path.join(project, name)), hash(path.join(before.source, 'template', name)), name)
        }
        const unchanged = Object.fromEntries(['index.html', 'main.js', 'lib.js', 'templates.js', 'subtitles.js', 'style.css', 'face.js', 'subs.js', 'wall.js'].map(name => [name, hash(path.join(project, name))]))
        const importArgs = ['import', project, input]
        commands.push({ command: pythonExecutable(), args: ['-X', 'utf8', path.join(before.source, 'scripts/pipeline.py'), ...importArgs], env: { FPS: '10', TALK_SIZE: '180x320' } })
        const imported = runUpstream(tool, importArgs, { cwd: tool, stdio: 'pipe', env: { FPS: '10', TALK_SIZE: '180x320' } })
        assert.equal(imported.status, 0, imported.stderr + imported.stdout)
        const metadata = json(path.join(project, 'import.json'))
        assert.equal(metadata.source, input)
        assert.equal(metadata.fps, 10)
        assert.equal(metadata.frames, 12)
        assert.equal(metadata.duration, 1.2)
        assert.equal(metadata.color.source_sha256, inputHash)
        assert.equal(metadata.frame_width, 180)
        assert.equal(metadata.frame_height, 320)
        assert.equal(metadata.subtitles, 'not generated')
        const map = vm.runInNewContext(fs.readFileSync(path.join(project, 'talkmap.js'), 'utf8') + '\nJSON.stringify({folders:TALKF, frames:TALKMAP})')
        assert.deepEqual(JSON.parse(map), { folders: ['clip_000'], frames: Array.from({ length: 12 }, (_, index) => [0, index + 1]) })
        assert.equal(fs.readdirSync(path.join(project, 'talk/clip_000')).filter(name => /^f_\d+\.jpg$/.test(name)).length, 12)
        const voice = path.join(project, 'voice.wav')
        const voiceProbe = probe(voice)
        const voiceStream = voiceProbe.streams.find(stream => stream.codec_type === 'audio')
        assert.equal(voiceStream.codec_name, 'pcm_s16le')
        assert.equal(voiceStream.sample_rate, '48000')
        assert.equal(voiceStream.channels, 2)
        assert.equal(Number(voiceStream.duration), 1.2)
        const expectedPCM = execute('ffmpeg', ['-v', 'error', '-i', input, '-map', '0:a:0', '-vn', '-af', 'aresample=48000:first_pts=0,apad,atrim=duration=1.2', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', '-f', 's16le', '-'], { encoding: null })
        const importedPCM = execute('ffmpeg', ['-v', 'error', '-i', voice, '-f', 's16le', '-'], { encoding: null })
        assert.deepEqual(importedPCM, expectedPCM, 'voice.wav must contain the original source audio on the import clock')
        const voiceHash = hash(voice)
        const protectedAfterImport = hash(path.join(project, 'talkmap.js'))
        const repeated = runUpstream(tool, importArgs, { cwd: tool, stdio: 'pipe', env: { FPS: '10', TALK_SIZE: '180x320' } })
        assert.notEqual(repeated.status, 0)
        assert.equal(hash(voice), voiceHash)
        assert.equal(hash(path.join(project, 'talkmap.js')), protectedAfterImport)
        assert.throws(() => createPresenterProject(tool, project), /overwrite/)
        const config = fs.readFileSync(path.join(project, 'config.js'), 'utf8')
        fs.writeFileSync(path.join(project, 'config.js'), config + '\nObject.assign(CONFIG, {demo:false, fps:10, end:1.2, subtitles:false, race:{labels:["Contract"],keys:[0,1.2]}});\n')
        fs.writeFileSync(path.join(project, 'scenes.js'), 'window.END = CONFIG.end;\nTPL.hero({t0:0,t1:CONFIG.end,lines:[["Contract",0]],sub:"Synthetic input only"});\n')
        const browser = chrome(process.env.VIDEO_GENERATOR_BROWSER ?? process.env.CHROME)
        const playwright = require.resolve('playwright-core')
        assert(playwright.startsWith(path.join(tool, 'node_modules') + path.sep))
        const output = path.join(root, 'synthetic-presenter.mp4')
        execute(pythonExecutable(), ['-X', 'utf8', path.join(before.source, 'scripts/export_project.py'), project, output, '--audio', voice, '--fps', '10', '--end', '1.2', '--segments', '1', '--width', '1920', '--height', '1080', '--playwright-module', playwright, '--browser', browser])
        const outputProbe = probe(output)
        const video = outputProbe.streams.find(stream => stream.codec_type === 'video')
        const audio = outputProbe.streams.find(stream => stream.codec_type === 'audio')
        assert.equal(video.width, 1920)
        assert.equal(video.height, 1080)
        assert.equal(Number(video.nb_read_frames), 12)
        assert.equal(video.avg_frame_rate, '10/1')
        assert.equal(Number(video.duration), 1.2)
        assert.equal(audio.codec_name, 'aac')
        assert.equal(audio.sample_rate, '48000')
        assert.equal(audio.channels, 2)
        const finalPCM = execute('ffmpeg', ['-v', 'error', '-i', output, '-map', '0:a:0', '-t', '1.2', '-ar', '48000', '-ac', '2', '-f', 's16le', '-'], { encoding: null })
        let energy = 0
        for (let offset = 0; offset < finalPCM.length; offset += 2) energy += (finalPCM.readInt16LE(offset) / 32768) ** 2
        const audioRms = Math.sqrt(energy / (finalPCM.length / 2))
        assert(audioRms > 0.01, 'Export audio must contain the synthetic source tone, not silence')
        execute('ffmpeg', ['-v', 'error', '-xerror', '-i', output, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'])
        const frame = path.join(root, 'synthetic-presenter-frame.png')
        execute('ffmpeg', ['-v', 'error', '-n', '-ss', '0.5', '-i', output, '-frames:v', '1', frame])
        const manifest = json(output + '.manifest.json')
        assert.equal(manifest.frames, 12)
        assert.equal(manifest.frame_clock.frames, 12)
        assert.equal(manifest.audio_identity.sha256, voiceHash)
        assert.equal(manifest.output_sha256, hash(output))
        assert(manifest.verification.includes('complete media decode'))
        for (const [name, digest] of Object.entries(unchanged)) assert.equal(hash(path.join(project, name)), digest, name)
        assert.equal(hash(voice), voiceHash)
        evidence = { probe: 'synthetic contract probe; NOT real presenter quality, face tracking, lip sync, ASR or TTS validation', syntheticMediaOnly: true, networkCalled: false, pythonVersion, browser, playwright, project, input, inputSha256: inputHash, inputProbe, compatibility, testOnlyProjectChanges: { 'config.js': { demo: false, fps: 10, end: 1.2, subtitles: false, race: { labels: ['Contract'], keys: [0, 1.2] } }, 'scenes.js': 'Native TPL.hero, END=CONFIG.end, 0..1.2 seconds' }, metadata, voice: { file: voice, sha256: voiceHash, pcmSha256: sha256(importedPCM), sourceDecodedPCMIdentical: true, probe: voiceProbe }, output, outputSha256: hash(output), outputProbe, audioRms, frame, exportManifest: output + '.manifest.json', commands }
    } finally {
        assert.equal(hash(input), inputHash, 'Input MP4 must not change')
        const after = loadUpstream(tool)
        assert.equal(after.verification.checked, 1042)
        assert.deepEqual(fingerprints(after), upstreamHashes, 'All 1042 upstream SHA256 values must remain identical')
        save(path.join(root, 'upstream-sha256.json'), { before: upstreamHashes, after: fingerprints(after), checked: 1042, unchanged: true })
        if (evidence) {
            save(path.join(root, 'evidence.json'), { ...evidence, inputUnmodified: true, upstreamFilesChecked: 1042, upstreamUnchanged: true, upstreamSha256Evidence: path.join(root, 'upstream-sha256.json') })
            console.log('Presenter evidence:', path.join(root, 'evidence.json'))
        } else console.log('Incomplete presenter probe artifacts:', root)
    }
})