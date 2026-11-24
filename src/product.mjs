import fs from 'node:fs'
import path from 'node:path'
import { loadProject, projectPath, hash, probe, run } from './media.mjs'
import { loadUpstream, runUpstream } from './upstream.mjs'

const json = value => JSON.stringify(value, null, 2)
const scriptJSON = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0'))
const exists = file => {
    try { fs.lstatSync(file); return true } catch (error) { if (error.code !== 'ENOENT') throw error; return false }
}
const inside = (root, file, required = false) => projectPath(root, path.relative(root, path.resolve(root, file)), required)
const write = (root, name, content) => fs.writeFileSync(path.join(root, name), content, { flag: 'wx' })

function checkedPipeline(toolRoot, args, env = {}) {
    const result = runUpstream(toolRoot, args, { stdio: 'pipe', env })
    if (result.status !== 0) throw Error(`Upstream ${args[0]} failed: ${result.stderr || result.stdout || result.status}`)
    return { stdout: result.stdout, stderr: result.stderr }
}

function sourceFrames(file) {
    const result = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_frames', '-show_streams', '-show_entries', 'frame=best_effort_timestamp:stream=time_base', '-of', 'json', file]))
    const [numerator, denominator] = result.streams[0].time_base.split('/').map(Number)
    if (!Number.isFinite(numerator / denominator) || numerator <= 0 || denominator <= 0) throw Error('Invalid source time base')
    const timestamps = result.frames.map(frame => frame.best_effort_timestamp)
    if (timestamps.some(timestamp => !Number.isSafeInteger(timestamp))) throw Error('Source requires exact integer display timestamps')
    const times = timestamps.map(timestamp => (timestamp - timestamps[0]) * numerator / denominator)
    if (!times.length || times.some((time, index) => !Number.isFinite(time) || (index > 0 && time < times[index - 1]))) throw Error('Source requires ordered display timestamps')
    return times
}

function frameAt(times, cursor) {
    let first = 0, last = times.length - 1
    while (first < last) {
        const middle = Math.ceil((first + last) / 2)
        if (times[middle] <= cursor + 1e-7) first = middle
        else last = middle - 1
    }
    return first
}

function prepareFrames(project, destination, copyInput) {
    const sources = new Map(), clips = []
    let timelineFrame = 0
    for (const clip of project.clips) {
        const count = Math.round(clip.duration * project.plan.fps)
        const original = copyInput(clip.file)
        let source = sources.get(clip.file)
        if (!source && clip.mode !== 'image') {
            source = { original, times: sourceFrames(clip.file), selected: new Set(), directory: `frames/source-${sources.size}` }
            sources.set(clip.file, source)
        }
        const metadata = probe(clip.file).streams.find(stream => stream.codec_type === 'video')
        if (['smpte2084', 'arib-std-b67'].includes(metadata.color_transfer) || ['bt2020nc', 'bt2020c'].includes(metadata.color_space) || metadata.side_data_list?.some(item => /dovi|dolby vision/i.test(item.side_data_type ?? ''))) throw Error('HDR/wide-gamut/Dolby Vision source requires explicit upstream color preparation before product binding')
        if ((metadata.tags?.rotate && Number(metadata.tags.rotate) !== 0) || metadata.side_data_list?.some(item => item.rotation)) throw Error('Rotated source needs an explicitly prepared upright asset')
        if (metadata.sample_aspect_ratio && !['1:1', '0:1', 'N/A'].includes(metadata.sample_aspect_ratio)) throw Error('Non-square source pixels require explicit preparation')
        const frames = Array.from({ length: count }, (_, index) => {
            const sourceTime = clip.in + (clip.mode === 'play' ? index / project.plan.fps : 0)
            if (clip.mode === 'image') return { file: original, sourceTime: 0, sourcePts: null, sourceFrame: null }
            const sourceFrame = frameAt(source.times, sourceTime)
            source.selected.add(sourceFrame)
            return { sourceTime, sourcePts: source.times[sourceFrame], sourceFrame }
        })
        const ratio = Math.min(1, (project.plan.width - 2 * project.plan.inset) / clip.crop.width, (project.plan.height - 2 * project.plan.inset - clip.bounds.captionBand) / clip.crop.height)
        const width = clip.crop.width * ratio, height = clip.crop.height * ratio
        const bounds = { ...clip.bounds, ratio, width, height, x: (project.plan.width - width) / 2, y: (project.plan.height - clip.bounds.captionBand - height) / 2 }
        clips.push({
            mode: clip.mode, source: clip.source, original, sha256: clip.sha256,
            sourceWidth: metadata.width, sourceHeight: metadata.height, crop: clip.crop, bounds,
            sourceRange: { start: clip.in, end: clip.in + (clip.mode === 'play' ? count / project.plan.fps : 0) },
            start: timelineFrame / project.plan.fps, end: (timelineFrame + count) / project.plan.fps, frames
        })
        timelineFrame += count
    }
    for (const [file, source] of sources) {
        fs.mkdirSync(path.join(destination, source.directory), { recursive: true })
        const selected = [...source.selected].sort((first, second) => first - second)
        const filter = `${source.directory}/select.txt`
        let expressions = selected.map(index => `eq(n\\,${index})`)
        while (expressions.length > 1) {
            const balanced = []
            for (let index = 0; index < expressions.length; index += 2) {
                balanced.push(index + 1 < expressions.length ? `(${expressions[index]}+${expressions[index + 1]})` : expressions[index])
            }
            expressions = balanced
        }
        write(destination, filter, 'select=' + expressions[0])
        run('ffmpeg', ['-v', 'error', '-n', '-noautorotate', '-i', path.join(destination, source.original), '-/filter_complex', path.join(destination, filter), '-an', '-fps_mode', 'vfr', '-start_number', '0', path.join(destination, source.directory, 'frame-%08d.png')])
        const files = new Map(selected.map((index, ordinal) => [index, `${source.directory}/frame-${String(ordinal).padStart(8, '0')}.png`]))
        for (const name of files.values()) if (!fs.existsSync(path.join(destination, name))) throw Error('Source frame extraction incomplete')
        for (const clip of clips.filter(item => item.original === source.original && item.mode !== 'image')) {
            for (const frame of clip.frames) frame.file = files.get(frame.sourceFrame)
        }
    }
    return clips
}

function prepareAudio(project, destination, copyInput) {
    const duration = String(project.duration)
    const silence = target => run('ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', duration, '-c:a', 'pcm_s16le', path.join(destination, target)])
    silence('sfx.wav')
    if (project.music) {
        const original = copyInput(project.music.file)
        run('ffmpeg', ['-v', 'error', '-n', '-i', path.join(destination, original), '-vn', '-t', duration, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', path.join(destination, 'bgm.wav')])
    } else silence('bgm.wav')
    if (project.narration.length) {
        const args = ['-v', 'error', '-n', '-f', 'lavfi', '-t', duration, '-i', 'anullsrc=r=48000:cl=stereo']
        for (const voice of project.narration) args.push('-i', path.join(destination, copyInput(voice.file)))
        const graph = project.narration.map((voice, index) => `[${index + 1}:a]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS,adelay=${Math.round(voice.at * 48000)}S:all=1[voice${index}]`)
        graph.push(`[0:a]${project.narration.map((_, index) => `[voice${index}]`).join('')}amix=inputs=${project.narration.length + 1}:normalize=0:duration=first[out]`)
        run('ffmpeg', [...args, '-filter_complex', graph.join(';'), '-map', '[out]', '-t', duration, '-c:a', 'pcm_s16le', path.join(destination, 'voice.wav')])
    }
    write(destination, 'mix_recipe.json', json({ schema: 'adu-mix/1', voiceMode: project.narration.length ? 'file' : 'none', musicVolume: project.music?.gain ?? 0.5 }))
}

export function createProductProject(toolRoot, manifestPath, destination) {
    const upstream = loadUpstream(toolRoot)
    const project = loadProject(path.resolve(manifestPath))
    const target = inside(project.root, destination)
    if (exists(target)) throw Error('Refusing to overwrite product project')
    if (project.music) {
        const length = Number(probe(project.music.file).format.duration)
        if (!Number.isFinite(length) || length < project.duration) throw Error('Music is shorter than the whole output; supply a complete track, never silently loop')
    }
    for (const clip of project.clips) {
        if (clip.bounds.width > project.plan.width - 2 * project.plan.inset || clip.bounds.height > project.plan.height - 2 * project.plan.inset - clip.bounds.captionBand) throw Error('Contain bounds exceed available image area')
    }
    const sourceInputs = new Set([...project.inputs.map(input => input.file), path.resolve(manifestPath)])
    for (const voice of project.narration) if (voice.metadata) sourceInputs.add(projectPath(project.root, voice.metadata, true))
    if (project.music) sourceInputs.add(projectPath(project.root, project.music.license, true))
    const originals = [...sourceInputs].map(file => ({ source: path.relative(project.root, file).split(path.sep).join('/'), sha256: hash(file) }))
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.mkdirSync(target)
    fs.mkdirSync(path.join(target, 'originals'))
    const copied = new Map()
    const copyInput = file => {
        if (!copied.has(file)) {
            const relative = `originals/source-${copied.size}${path.extname(file).toLowerCase()}`
            fs.copyFileSync(file, path.join(target, relative), fs.constants.COPYFILE_EXCL)
            copied.set(file, relative)
        }
        return copied.get(file)
    }
    for (const file of sourceInputs) copyInput(file)
    const clips = prepareFrames(project, target, copyInput)
    prepareAudio(project, target, copyInput)
    for (const name of ['lib.js', 'main.js', 'subtitles.js', 'style.css', 'output-signature.json']) fs.copyFileSync(path.join(upstream.source, 'template', name), path.join(target, name), fs.constants.COPYFILE_EXCL)
    for (const [source, name] of [['LICENSE', 'ADU-LICENSE.txt'], ['THIRD_PARTY.md', 'ADU-THIRD-PARTY.md']]) fs.copyFileSync(path.join(upstream.source, source), path.join(target, name), fs.constants.COPYFILE_EXCL)
    fs.cpSync(path.join(upstream.source, 'template/brand'), path.join(target, 'brand'), { recursive: true, errorOnExist: true, force: false })
    fs.copyFileSync(path.join(toolRoot, 'extensions/product-runtime.js'), path.join(target, 'product-runtime.js'), fs.constants.COPYFILE_EXCL)
    const captionBand = clips[0].bounds.captionBand
    write(target, 'config.js', `window.CONFIG=${scriptJSON({ scenario: 'product', demo: false, fps: project.plan.fps, width: project.plan.width, height: project.plan.height, end: project.duration, background: project.plan.background, race: { keys: [0, project.duration], labels: [] }, subtitles: project.captions.length > 0, subtitlePosition: { bottomRatio: Math.max(1, project.plan.inset) / project.plan.height, leftRatio: project.plan.inset / project.plan.width, rightRatio: project.plan.inset / project.plan.width }, subtitleStyle: { zhSize: Math.max(16, Math.round(project.plan.height * 0.024)), enSize: 16, gap: 0 } })};\n`)
    write(target, 'subs.js', `window.SUBS=${scriptJSON(project.captions.map((caption, index) => ({ id: index, t0: caption.start, t1: caption.end, zh: caption.text })))};\n`)
    const receipt = {
        schema: 'adu-product/1', scenario: 'product', root: project.root, manifest: path.resolve(manifestPath), duration: project.duration,
        width: project.plan.width, height: project.plan.height, fps: project.plan.fps, frames: project.frames, sourceAudioDiscarded: true,
        upstream: { repository: upstream.lock.repository, commit: upstream.lock.commit, exporter: 'scripts/export_project.py', verifiedFiles: upstream.verification.checked },
        originals: originals.map(item => ({ ...item, file: copied.get(path.resolve(project.root, item.source)) })), clips,
        narration: project.narration.map(voice => ({ source: voice.source, file: copied.get(voice.file), at: voice.at, duration: voice.duration, sha256: voice.sha256, metadata: voice.metadata ? copied.get(projectPath(project.root, voice.metadata, true)) : null })),
        captions: project.captions, music: project.music ? { source: project.music.source, file: copied.get(project.music.file), sha256: project.music.sha256, license: copied.get(projectPath(project.root, project.music.license, true)), loop: false } : null,
        ttsNetworkCalled: false, visualApproval: 'pending', files: {}
    }
    write(target, 'product-data.js', `window.PRODUCT=${scriptJSON({ schema: receipt.schema, scenario: receipt.scenario, duration: receipt.duration, clips })};\n`)
    write(target, 'index.html', '<!doctype html>\n<html><head><meta charset="utf-8"><link rel="stylesheet" href="style.css"></head><body><div id="stage"><div id="world"></div><div id="fx"></div><div id="ov" style="position:absolute;inset:0;pointer-events:none"></div></div>\n' + ['config.js', 'subs.js', 'lib.js', 'product-data.js', 'subtitles.js', 'product-runtime.js', 'main.js'].map(name => `<script src="${name}"></script>`).join('\n') + '\n</body></html>\n')
    const collect = directory => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name)
            if (entry.isDirectory()) collect(file)
            else receipt.files[path.relative(target, file).split(path.sep).join('/')] = hash(file)
        }
    }
    collect(target)
    delete receipt.files['mix_recipe.json']
    write(target, 'product.json', json(receipt))
    return { project: target, scenario: 'product', duration: project.duration, frames: project.frames, receipt: path.join(target, 'product.json') }
}

export function renderProductProject(toolRoot, projectDir, outputFile) {
    const upstream = loadUpstream(toolRoot), project = path.resolve(projectDir)
    const receipt = JSON.parse(fs.readFileSync(path.join(project, 'product.json'), 'utf8'))
    if (receipt.schema !== 'adu-product/1' || receipt.scenario !== 'product' || receipt.upstream.commit !== upstream.lock.commit) throw Error('Product project/upstream identity mismatch')
    if (fs.realpathSync(inside(receipt.root, project)) !== fs.realpathSync(project)) throw Error('Product project is outside its root')
    const output = inside(receipt.root, path.resolve(project, outputFile))
    if (path.extname(output).toLowerCase() !== '.mp4') throw Error('Output must be MP4')
    for (const file of [output, output + '.manifest.json']) if (exists(file)) throw Error('Refusing to overwrite output or export manifest')
    const verify = () => {
        for (const [relative, expected] of Object.entries(receipt.files)) if (hash(projectPath(project, relative, true)) !== expected) throw Error('Product asset changed: ' + relative)
        for (const original of receipt.originals) if (hash(projectPath(receipt.root, original.source, true)) !== original.sha256) throw Error('Original source changed: ' + original.source)
    }
    verify()
    fs.mkdirSync(path.dirname(output), { recursive: true })
    const lock = path.join(project, '.product-render.lock')
    const descriptor = fs.openSync(lock, 'wx')
    try {
        const env = { END: String(receipt.duration), W: String(receipt.width), H: String(receipt.height), FPS: String(receipt.fps), HTML: 'index.html', SILENT: '0', VOICE: receipt.narration.length ? 'file' : 'none' }
        const mix = checkedPipeline(toolRoot, ['mix', project, String(receipt.music ? JSON.parse(fs.readFileSync(path.join(project, 'mix_recipe.json'), 'utf8')).musicVolume : 0)], env)
        const rendered = checkedPipeline(toolRoot, ['render', project, output, '2'], env)
        verify()
        const report = JSON.parse(fs.readFileSync(output + '.manifest.json', 'utf8'))
        if (report.schema !== 'adu-motion-video-export/v1' || report.output_sha256 !== hash(output)) throw Error('Missing genuine upstream export receipt')
        return { output, project, scenario: 'product', exporter: 'upstream/adu-motion-video/scripts/export_project.py', report, mix, rendered }
    } finally {
        fs.closeSync(descriptor)
        fs.unlinkSync(lock)
    }
}