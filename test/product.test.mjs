import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { createProductProject, renderProductProject } from '../src/product.mjs'
import { hash, probe, run } from '../src/media.mjs'
import { loadUpstream } from '../src/upstream.mjs'
import { chrome } from '../upstream/adu-motion-video/scripts/chrome.mjs'

const tool = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.join(tool, 'sessions', `product-${Date.now()}-${process.pid}`, '产品 合成 contract')
fs.mkdirSync(path.join(root, 'assets'), { recursive: true })
const save = (relative, value) => fs.writeFileSync(path.join(root, relative), JSON.stringify(value, null, 2), { flag: 'wx' })
const asset = name => path.join(root, 'assets', name)
const require = createRequire(import.meta.url)

function pixels(file, time, crop) {
    const result = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(time), '-i', file, '-frames:v', '1', ...(crop ? ['-vf', `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`] : []), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 8 * 1024 * 1024 })
    assert.equal(result.status, 0, result.stderr?.toString())
    assert(result.stdout.length > 0)
    return result.stdout
}

function difference(first, second) {
    assert.equal(first.length, second.length)
    let total = 0
    for (let index = 0; index < first.length; index++) total += Math.abs(first[index] - second[index])
    return total / first.length
}

test('real upstream product export: narration, PNG, exact freeze/resume, safe captions and boundaries', async () => {
    process.env.CHROME = chrome(process.env.VIDEO_GENERATOR_BROWSER ?? process.env.CHROME)
    const before = loadUpstream(tool)
    run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=192x96:rate=10', '-vf', 'drawbox=x=0:y=0:w=iw:h=ih:color=white:t=4', '-t', '2', '-c:v', 'ffv1', asset('source 动态.mkv')])
    run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'color=c=green:size=192x96', '-vf', 'drawbox=x=0:y=0:w=iw:h=ih:color=white:t=4', '-frames:v', '1', asset('original 原图.png')])
    run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '0.3', asset('voice 旁白.wav')])
    run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'sine=frequency=120:sample_rate=48000', '-t', '2', asset('music.wav')])
    run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'sine=frequency=120:sample_rate=48000', '-t', '0.1', asset('short.wav')])
    const literal = '<img src=x onerror="window.INJECTED=true"> & 原文'
    const metadata = { fixture: 'synthetic contract fixture; generated tone and caption intervals, NOT a TTS service call', successCode: 20000000, sha256: hash(asset('voice 旁白.wav')), captions: [{ start: 0, end: 0.25, text: literal }] }
    save('assets/voice.json', metadata)
    const license = file => ({ approved: true, sourceUrl: 'https://example.invalid/synthetic-generated-tone', usage: 'Synthetic test signal only; not a third-party music license', sha256: hash(asset(file)) })
    save('assets/license.json', license('music.wav'))
    save('assets/short-license.json', license('short.wav'))
    const plan = {
        version: 1, name: '</script><img src=x onerror=alert(1)>', width: 320, height: 240, fps: 10, inset: 12, background: '#101010', output: 'deliverables/legacy-unused.mp4', clips: [
            { mode: 'play', source: 'assets/source 动态.mkv', in: 0, duration: 0.4 },
            { mode: 'freeze', source: 'assets/source 动态.mkv', in: 0.45, duration: 0.4 },
            { mode: 'play', source: 'assets/source 动态.mkv', in: 0.45, duration: 0.4 },
            { mode: 'image', source: 'assets/original 原图.png', duration: 0.6 }
        ], narration: [{ source: 'assets/voice 旁白.wav', at: 0.4, metadata: 'assets/voice.json' }], music: { source: 'assets/music.wav', license: 'assets/license.json', gain: 0.3 }
    }
    save('project.json', plan)
    const manifest = path.join(root, 'project.json')
    const created = createProductProject(tool, manifest, '工程 有空格')
    const receipt = JSON.parse(fs.readFileSync(path.join(created.project, 'product.json'), 'utf8'))
    assert.equal(receipt.scenario, 'product')
    assert.equal(receipt.ttsNetworkCalled, false)
    assert.equal(receipt.sourceAudioDiscarded, true)
    assert(!fs.existsSync(path.join(created.project, 'talk')))
    assert.equal(receipt.music.loop, false)
    assert.equal(hash(path.join(created.project, 'ADU-LICENSE.txt')), hash(path.join(before.source, 'LICENSE')))
    assert.equal(hash(path.join(created.project, 'ADU-THIRD-PARTY.md')), hash(path.join(before.source, 'THIRD_PARTY.md')))
    assert.equal(receipt.narration[0].at, 0.4)
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(created.project, receipt.narration[0].metadata), 'utf8')), metadata)
    assert.equal(hash(path.join(created.project, receipt.clips[3].original)), hash(asset('original 原图.png')))
    assert.equal(receipt.clips[1].frames[0].sourcePts, 0.4)
    assert.equal(receipt.clips[1].frames[0].file, receipt.clips[2].frames[0].file)
    assert.equal(receipt.clips[2].frames[1].sourcePts, 0.5)
    assert.equal(receipt.clips[1].frames[0].sourceTime, 0.45)
    for (const clip of receipt.clips) {
        assert(clip.bounds.x >= plan.inset)
        assert(clip.bounds.y >= plan.inset)
        assert(clip.bounds.x + clip.bounds.width <= plan.width - plan.inset)
        assert(clip.bounds.y + clip.bounds.height <= plan.height - plan.inset - clip.bounds.captionBand)
    }
    for (const name of ['main.js', 'lib.js', 'subtitles.js', 'style.css']) assert.equal(hash(path.join(created.project, name)), hash(path.join(before.source, 'template', name)))
    assert.throws(() => createProductProject(tool, manifest, created.project), /overwrite/)
    assert.throws(() => createProductProject(tool, manifest, '../escaped-product'), /outside/)
    const playwright = await import(pathToFileURL(require.resolve(process.env.ADU_PLAYWRIGHT_MODULE ?? 'playwright-core')).href)
    const chromium = playwright.chromium ?? playwright.default.chromium
    const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ['--allow-file-access-from-files'] })
    try {
        const page = await browser.newPage({ viewport: { width: 320, height: 240 } })
        await page.goto(pathToFileURL(path.join(created.project, 'index.html')).href)
        const state = await page.evaluate(async () => {
            await window.READY
            await window.renderAt(0.5)
            await window.imgWait()
            return { text: document.querySelector('.native-subtitles').textContent, injected: Boolean(window.INJECTED), forbidden: document.querySelectorAll('video,audio,.native-subtitles img').length, fit: document.querySelector('.native-subtitles').dataset.fit, rect: document.querySelector('.native-subtitles').getBoundingClientRect().toJSON(), scenes: document.querySelectorAll('[data-scenario="product"]').length }
        })
        assert.equal(state.text, literal)
        assert.equal(state.injected, false)
        assert.equal(state.forbidden, 0)
        assert.equal(state.fit, 'fits', JSON.stringify(state.rect))
        assert.equal(state.scenes, 4)
    } finally { await browser.close() }
    const output = path.join(root, '成片 独立.mp4')
    const exported = renderProductProject(tool, created.project, output)
    const video = probe(output).streams.find(stream => stream.codec_type === 'video')
    assert.equal(video.width, plan.width)
    assert.equal(video.height, plan.height)
    assert.equal(exported.report.frames, 18)
    assert.equal(exported.report.frame_clock.frames, 18)
    assert.equal(exported.report.audio_identity.sha256, hash(path.join(created.project, 'mix.wav')))
    assert(exported.report.verification.includes('complete media decode'))
    assert.equal(exported.report.output_sha256, hash(output))
    assert(probe(output).streams.some(stream => stream.codec_type === 'audio'))
    const bounds = receipt.clips[1].bounds
    const frozen = pixels(output, 0.4, bounds)
    assert(difference(frozen, pixels(output, 0.6, bounds)) < 3, 'Freeze stays fixed while the subtitle clock advances')
    assert(difference(frozen, pixels(output, 0.8, bounds)) < 3, 'Resume starts at the same actual source PTS')
    assert(difference(frozen, pixels(output, 1, bounds)) > 3, 'Playback advances after resume')
    const frame = pixels(output, 1.2)
    const pixel = (column, row) => [...frame.subarray((row * plan.width + column) * 3, (row * plan.width + column) * 3 + 3)]
    for (const [column, row] of [[bounds.x + 1, bounds.y + 1], [bounds.x + bounds.width - 2, bounds.y + 1], [bounds.x + 1, bounds.y + bounds.height - 2], [bounds.x + bounds.width - 2, bounds.y + bounds.height - 2]]) assert(pixel(column, row).every(value => value > 210), 'All four original image corners remain visible')
    assert(pixel(2, 100).every(value => value < 40), 'Inset remains outside the source')
    const outputHash = hash(output)
    assert.throws(() => renderProductProject(tool, created.project, output), /overwrite/)
    assert.equal(hash(output), outputHash)
    assert.throws(() => renderProductProject(tool, created.project, path.resolve(root, '../escape.mp4')), /outside/)
    save('short.json', { ...plan, music: { source: 'assets/short.wav', license: 'assets/short-license.json' } })
    assert.throws(() => createProductProject(tool, path.join(root, 'short.json'), 'short-project'), /shorter.*never silently loop/)
    assert(!fs.existsSync(path.join(root, 'short-project')))
    save('invalid-meta.json', { ...metadata, sha256: 'wrong' })
    save('invalid.json', { ...plan, narration: [{ ...plan.narration[0], metadata: 'invalid-meta.json' }] })
    assert.throws(() => createProductProject(tool, path.join(root, 'invalid.json'), 'invalid-project'), /identity mismatch/)
    const after = loadUpstream(tool)
    assert.equal(after.verification.checked, before.verification.checked)
    assert.equal(after.verification.upstreamUnmodified, true)
    save('evidence.json', { syntheticMediaOnly: true, ttsNetworkCalled: false, project: created.project, output, outputSha256: outputHash, upstreamExporter: exported.exporter, verifiedUpstreamFiles: after.verification.checked, exportManifest: output + '.manifest.json', metadataFixture: metadata.fixture })
    console.log('Product evidence:', path.join(root, 'evidence.json'))
})

test('second independent image-only project uses upstream export without a presenter or narration', () => {
    const second = path.join(root, '第二个 独立工程')
    fs.mkdirSync(second)
    fs.copyFileSync(asset('original 原图.png'), path.join(second, 'original.png'))
    const plan = { version: 1, name: 'Image only', width: 480, height: 320, fps: 10, inset: 16, background: '#171717', output: 'unused.mp4', clips: [{ mode: 'image', source: 'original.png', duration: 0.8, crop: { x: 16, y: 8, width: 159, height: 79 } }], narration: [] }
    fs.writeFileSync(path.join(second, 'project.json'), JSON.stringify(plan), { flag: 'wx' })
    const created = createProductProject(tool, path.join(second, 'project.json'), 'adu 产品')
    const output = path.join(second, 'image-only.mp4')
    const exported = renderProductProject(tool, created.project, output)
    assert.equal(exported.report.frames, 8)
    assert.equal(exported.report.width, 480)
    assert.equal(exported.report.height, 320)
    assert(!fs.existsSync(path.join(created.project, 'voice.wav')))
    assert(!fs.existsSync(path.join(created.project, 'talk')))
    const receipt = JSON.parse(fs.readFileSync(path.join(created.project, 'product.json'), 'utf8'))
    assert.deepEqual(receipt.clips[0].crop, plan.clips[0].crop)
    assert.equal(receipt.clips[0].bounds.width / receipt.clips[0].bounds.height, 159 / 79)
    assert.equal(receipt.narration.length, 0)
    assert.equal(receipt.music, null)
    console.log('Image-only upstream MP4:', output)
})

test('fractional source timestamps preserve exact frame identity without rounded ffprobe times', () => {
    const directory = path.join(root, 'fractional-clock')
    fs.mkdirSync(directory)
    run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=192x96:rate=60', '-t', '0.2', '-c:v', 'libx264', '-video_track_timescale', '60000', path.join(directory, 'source.mp4')])
    const plan = {
        version: 1, name: 'Fractional source clock', width: 320, height: 240, fps: 30, inset: 8, background: '#101010', output: 'unused.mp4', clips: [
            { mode: 'freeze', source: 'source.mp4', in: 1 / 60, duration: 0.1 },
            { mode: 'play', source: 'source.mp4', in: 1 / 60, duration: 0.1 }
        ], narration: []
    }
    fs.writeFileSync(path.join(directory, 'project.json'), JSON.stringify(plan), { flag: 'wx' })
    const created = createProductProject(tool, path.join(directory, 'project.json'), 'adu')
    const receipt = JSON.parse(fs.readFileSync(path.join(created.project, 'product.json'), 'utf8'))
    assert.equal(receipt.clips[0].frames[0].sourceFrame, 1)
    assert.equal(receipt.clips[0].frames[0].sourcePts, 1 / 60)
    assert.equal(receipt.clips[0].frames[0].file, receipt.clips[1].frames[0].file)
    assert.equal(receipt.clips[1].frames[1].sourceFrame, 3)
})

test('large source frame selection preserves exact identities without expression depth failure', () => {
    const directory = path.join(root, 'large-selection')
    fs.mkdirSync(directory)
    const source = path.join(directory, 'source.mp4')
    run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=192x96:rate=60', '-t', '5', '-c:v', 'libx264', '-video_track_timescale', '60000', source])
    const plan = {
        version: 1, name: 'Large frame selection', width: 320, height: 240, fps: 60, inset: 8, background: '#101010', output: 'unused.mp4', clips: [
            { mode: 'play', source: 'source.mp4', in: 0, duration: 4 },
            { mode: 'freeze', source: 'source.mp4', in: 4, duration: 0.1 },
            { mode: 'play', source: 'source.mp4', in: 4, duration: 0.1 }
        ], narration: []
    }
    fs.writeFileSync(path.join(directory, 'project.json'), JSON.stringify(plan), { flag: 'wx' })
    const created = createProductProject(tool, path.join(directory, 'project.json'), 'adu')
    const receipt = JSON.parse(fs.readFileSync(path.join(created.project, 'product.json'), 'utf8'))
    assert.equal(receipt.clips[0].frames.length, 240)
    assert.equal(receipt.clips[1].frames[0].file, receipt.clips[2].frames[0].file)
    assert.equal(receipt.clips[1].frames[0].sourceFrame, 240)
    for (const index of [0, 119, 239]) {
        const expected = path.join(directory, `expected-${index}.png`)
        run('ffmpeg', ['-v', 'error', '-n', '-i', source, '-vf', `select=eq(n\\,${index})`, '-frames:v', '1', expected])
        assert.equal(hash(expected), hash(path.join(created.project, receipt.clips[0].frames[index].file)))
    }
})

test('declared HDR cannot silently bypass upstream source color preparation', () => {
    const directory = path.join(root, 'hdr-preflight')
    fs.mkdirSync(directory)
    run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=192x96:rate=10', '-t', '0.2', '-c:v', 'libx264', '-color_trc', 'smpte2084', '-color_primaries', 'bt2020', '-colorspace', 'bt2020nc', path.join(directory, 'declared-hdr.mp4')])
    const plan = { version: 1, name: 'Declared HDR gate fixture, not visual HDR validation', width: 320, height: 240, fps: 10, inset: 8, background: '#101010', output: 'unused.mp4', clips: [{ mode: 'play', source: 'declared-hdr.mp4', duration: 0.1 }], narration: [] }
    fs.writeFileSync(path.join(directory, 'project.json'), JSON.stringify(plan), { flag: 'wx' })
    assert.throws(() => createProductProject(tool, path.join(directory, 'project.json'), 'adu'), /HDR.*explicit upstream color preparation/)
    assert(!fs.existsSync(path.join(directory, 'unused.mp4')))
})