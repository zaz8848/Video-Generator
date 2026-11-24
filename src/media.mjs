import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { validateSchema } from './schema.mjs'

export const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
export function run(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    if (result.error) throw new Error(`${command} is unavailable: ${result.error.code}`)
    if (result.status !== 0) throw new Error(`${command} failed: ${(result.stderr || '').slice(-3000)}`)
    return result.stdout
}
export const probe = file => JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]))
export function projectPath(root, value, existing = false) {
    if (path.isAbsolute(value)) throw new Error('Project paths must be relative to the manifest')
    const candidate = path.resolve(root, value), relative = path.relative(root, candidate)
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Path is outside the project')
    let ancestor = candidate
    while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor)
    const realRoot = fs.realpathSync(root), realAncestor = fs.realpathSync(ancestor), realRelative = path.relative(realRoot, realAncestor)
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) throw new Error('Symlink leaves the project')
    if (existing && (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile())) throw new Error('Missing input: ' + value)
    return candidate
}
export function contain(width, height, plan) {
    const band = plan.captionBand ?? 0
    const areaWidth = plan.width - 2 * plan.inset, areaHeight = plan.height - 2 * plan.inset - band
    if (areaHeight < 2) throw new Error('Subtitle band leaves no image area')
    const ratio = Math.min(1, areaWidth / width, areaHeight / height)
    const drawWidth = Math.max(2, Math.floor(width * ratio / 2) * 2), drawHeight = Math.max(2, Math.floor(height * ratio / 2) * 2)
    return { width: drawWidth, height: drawHeight, x: Math.floor((plan.width - drawWidth) / 2), y: Math.floor((plan.height - band - drawHeight) / 2), ratio, sourceWidth: width, sourceHeight: height, captionBand: band }
}
function captionsFrom(metadata, voice, totalDuration) {
    if (metadata.successCode !== 20000000 || metadata.sha256 !== hash(voice.file)) throw new Error('Narration metadata identity mismatch')
    if (!Array.isArray(metadata.captions)) throw new Error('Missing service caption array')
    let previous = 0
    return metadata.captions.map(caption => {
        if (typeof caption.text !== 'string' || !Number.isFinite(caption.start) || !Number.isFinite(caption.end) || caption.start < previous || caption.end <= caption.start || caption.end > voice.duration + 0.15) throw new Error('Invalid service caption interval')
        previous = caption.end
        if (caption.end + voice.at > totalDuration + 0.15) throw new Error('Caption exceeds film duration')
        return { text: caption.text, start: voice.at + caption.start, end: voice.at + caption.end }
    })
}
export function loadProject(manifest) {
    const root = path.dirname(path.resolve(manifest)), plan = validateSchema(JSON.parse(fs.readFileSync(manifest, 'utf8').replace(/^\uFEFF/, '')))
    const output = projectPath(root, plan.output)
    if (path.extname(output).toLowerCase() !== '.mp4') throw new Error('Output must be MP4')
    const captionBand = plan.narration.some(voice => voice.metadata) ? Math.max(64, Math.ceil(plan.height * 0.1)) : 0
    const clips = plan.clips.map(clip => {
        const file = projectPath(root, clip.source, true), metadata = probe(file), video = metadata.streams.find(stream => stream.codec_type === 'video')
        if (!video) throw new Error('Clip has no video/image stream')
        const start = clip.in ?? 0, seconds = Number(metadata.format.duration), crop = clip.crop ?? { x: 0, y: 0, width: video.width, height: video.height }
        if (clip.mode !== 'image' && !Number.isFinite(seconds)) throw new Error('Clip duration unavailable')
        if (clip.mode === 'play' && start + clip.duration > seconds + 0.02) throw new Error('Playback exceeds source duration')
        if (clip.mode === 'freeze' && start >= seconds) throw new Error('Freeze time exceeds source duration')
        if (crop.x + crop.width > video.width || crop.y + crop.height > video.height) throw new Error('Crop exceeds actual source')
        if (clip.mode === 'image' && !['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(file).toLowerCase())) throw new Error('Image mode requires a still image')
        return { ...clip, in: start, duration: Math.ceil(clip.duration * plan.fps) / plan.fps, file, crop, bounds: contain(crop.width, crop.height, { ...plan, captionBand }), sha256: hash(file) }
    })
    const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0)
    const narration = plan.narration.map(voice => {
        const file = projectPath(root, voice.source, true), metadata = probe(file), seconds = Number(metadata.format.duration)
        if (!metadata.streams.some(stream => stream.codec_type === 'audio') || !Number.isFinite(seconds)) throw new Error('Narration has no audio')
        if (voice.at + seconds > totalDuration + 0.02) throw new Error('Narration exceeds film; extend the freeze/reading interval')
        return { ...voice, file, duration: seconds, sha256: hash(file) }
    }).sort((first, second) => first.at - second.at)
    for (let index = 1; index < narration.length; index++) if (narration[index].at < narration[index - 1].at + narration[index - 1].duration) throw new Error('Narration overlaps')
    const captions = narration.flatMap(voice => voice.metadata ? captionsFrom(JSON.parse(fs.readFileSync(projectPath(root, voice.metadata, true), 'utf8')), voice, totalDuration) : [])
    let music = null
    if (plan.music) {
        const file = projectPath(root, plan.music.source, true), licenseFile = projectPath(root, plan.music.license, true)
        const license = JSON.parse(fs.readFileSync(licenseFile, 'utf8'))
        if (license.sha256 !== hash(file) || typeof license.sourceUrl !== 'string' || !/^https?:\/\//.test(license.sourceUrl) || typeof license.usage !== 'string' || !license.usage.trim() || license.approved !== true) throw new Error('Music requires matching SHA256, sourceUrl, usage and explicit license approval')
        if (!probe(file).streams.some(stream => stream.codec_type === 'audio')) throw new Error('Music has no audio')
        music = { ...plan.music, file, sha256: hash(file) }
    }
    const inputs = [...clips, ...narration, ...(music ? [music] : [])]
    if (inputs.some(input => input.file === output)) throw new Error('Output would replace an input')
    return { root, plan, output, clips, narration, captions, music, inputs, duration: totalDuration, frames: Math.round(totalDuration * plan.fps) }
}
function assTime(seconds) {
    const centiseconds = Math.round(seconds * 100)
    return `${Math.floor(centiseconds / 360000)}:${String(Math.floor(centiseconds / 6000) % 60).padStart(2, '0')}:${String(Math.floor(centiseconds / 100) % 60).padStart(2, '0')}.${String(centiseconds % 100).padStart(2, '0')}`
}
export function subtitleText(text) {
    const safe = text.replace(/\\/g, '/').replace(/[{}]/g, '').replace(/[\r\n]/g, ' ')
    return [...safe].reduce((result, character, index) => result + (index && index % 34 === 0 ? '\\N' : '') + character, '')
}
function writeSubtitles(project, work) {
    const fontSize = Math.max(18, Math.round(project.plan.height * 0.024))
    const content = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${project.plan.width}\nPlayResY: ${project.plan.height}\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Microsoft YaHei,${fontSize},&H00FFFFFF,&H00FFFFFF,&H001C2521,&H801C2521,0,0,0,0,100,100,0,0,1,1.5,0,2,24,24,12,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n` + project.captions.map(caption => `Dialogue: 0,${assTime(caption.start)},${assTime(caption.end)},Default,,0,0,0,,${subtitleText(caption.text)}`).join('\n')
    fs.writeFileSync(path.join(work, 'captions.ass'), content, { flag: 'wx' })
}
export function verify(project, work = null) {
    const metadata = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', project.output]))
    const video = metadata.streams.find(stream => stream.codec_type === 'video'), audio = metadata.streams.find(stream => stream.codec_type === 'audio')
    if (!video || !audio || video.width !== project.plan.width || video.height !== project.plan.height || Math.abs(Number(metadata.format.duration) - project.duration) > 0.15) throw new Error('Output media contract mismatch')
    if (Number(video.nb_read_frames) !== project.frames) throw new Error('Decoded frame count differs from the timeline')
    run('ffmpeg', ['-v', 'error', '-i', project.output, '-f', 'null', '-'])
    for (const input of project.inputs) if (hash(input.file) !== input.sha256) throw new Error('Input media changed')
    const report = { output: project.output, sha256: hash(project.output), duration: Number(metadata.format.duration), width: video.width, height: video.height, fps: video.r_frame_rate, expectedFrames: project.frames, decodedFrames: Number(video.nb_read_frames), fullDecode: true, inputsUnchanged: true, clipBounds: project.clips.map(clip => clip.bounds), subtitleCount: project.captions.length, narrationClips: project.narration.length, music: Boolean(project.music), sourceAudioDiscarded: true, work, userVisualApproval: 'pending', browserPlayback: 'not performed by CLI; review actual file with audio' }
    if (work) fs.writeFileSync(path.join(work, 'verification.json'), JSON.stringify(report, null, 2), { flag: 'wx' })
    return report
}
export function render(project) {
    if (fs.existsSync(project.output)) throw new Error('Refusing to overwrite output; select a new version')
    const sessions = projectPath(project.root, 'sessions'), work = projectPath(project.root, 'sessions/' + crypto.randomUUID())
    fs.mkdirSync(sessions, { recursive: true }); fs.mkdirSync(work)
    fs.mkdirSync(path.dirname(project.output), { recursive: true })
    const parts = []
    for (const [index, clip] of project.clips.entries()) {
        const bounds = clip.bounds, part = `clip-${index}.mkv`
        let sourceFile = clip.file
        if (clip.mode === 'freeze') {
            sourceFile = path.join(work, `freeze-${index}.png`)
            run('ffmpeg', ['-v', 'error', '-n', '-ss', String(clip.in), '-i', clip.file, '-frames:v', '1', sourceFile], work)
        }
        const inputArgs = clip.mode === 'play' ? ['-ss', String(clip.in), '-i', sourceFile] : ['-loop', '1', '-framerate', String(project.plan.fps), '-i', sourceFile]
        const filters = [`crop=${clip.crop.width}:${clip.crop.height}:${clip.crop.x}:${clip.crop.y}:exact=1`, `scale=${bounds.width}:${bounds.height}:flags=lanczos`, `pad=${project.plan.width}:${project.plan.height}:${bounds.x}:${bounds.y}:color=${project.plan.background}`, `fps=${project.plan.fps}`, 'setsar=1', 'setpts=PTS-STARTPTS']
        run('ffmpeg', ['-v', 'error', '-n', ...inputArgs, '-an', '-vf', filters.join(','), '-t', String(clip.duration), '-frames:v', String(Math.round(clip.duration * project.plan.fps)), '-c:v', 'ffv1', '-pix_fmt', 'bgr0', part], work)
        parts.push(`file '${part}'`)
    }
    fs.writeFileSync(path.join(work, 'clips.ffconcat'), 'ffconcat version 1.0\n' + parts.join('\n'), { flag: 'wx' })
    writeSubtitles(project, work)
    const args = ['-v', 'error', '-n', '-f', 'concat', '-safe', '0', '-i', 'clips.ffconcat', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']
    const voiceLabels = []
    for (const voice of project.narration) args.push('-i', voice.file)
    if (project.music) args.push('-stream_loop', '-1', '-i', project.music.file)
    const graph = project.narration.map((voice, index) => {
        voiceLabels.push(`[voice${index}]`)
        return `[${index + 2}:a]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS,adelay=${Math.round(voice.at * 1000)}|${Math.round(voice.at * 1000)},apad,atrim=duration=${project.duration}[voice${index}]`
    })
    graph.push(`[1:a]atrim=duration=${project.duration}[silence]`)
    graph.push(`[silence]${voiceLabels.join('')}amix=inputs=${voiceLabels.length + 1}:normalize=0,loudnorm=I=-18:LRA=8:TP=-2,asplit=2[speech][side]`)
    if (project.music) {
        graph.push(`[${project.narration.length + 2}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration=${project.duration},loudnorm=I=-21:LRA=8:TP=-3,volume=${project.music.gain ?? 0.55},afade=t=in:d=0.4,afade=t=out:st=${Math.max(0, project.duration - 1)}:d=1[bed]`)
        graph.push('[bed][side]sidechaincompress=threshold=0.02:ratio=8:attack=25:release=650[ducked];[speech][ducked]amix=inputs=2:normalize=0,alimiter=limit=0.891:level=0[audio]')
    } else graph.push('[side]anullsink;[speech]alimiter=limit=0.891:level=0[audio]')
    graph.push(project.captions.length ? '[0:v]subtitles=filename=captions.ass[video]' : '[0:v]null[video]')
    run('ffmpeg', [...args, '-filter_complex', graph.join(';'), '-map', '[video]', '-map', '[audio]', '-t', String(project.duration), '-frames:v', String(project.frames), '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-b:a', '192k', '-movflags', '+faststart', 'film.mp4'], work)
    fs.linkSync(path.join(work, 'film.mp4'), project.output)
    fs.writeFileSync(path.join(work, 'manifest-snapshot.json'), JSON.stringify(project.plan, null, 2), { flag: 'wx' })
    return verify(project, work)
}