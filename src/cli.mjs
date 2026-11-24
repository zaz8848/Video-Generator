import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadProject, render, verify, run } from './media.mjs'
import { loadUpstream, runUpstream, pythonExecutable } from './upstream.mjs'
import { createProductProject, renderProductProject } from './product.mjs'
import { createPresenterProject } from './presenter.mjs'

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [command, target, ...rest] = process.argv.slice(2)
const passthrough = args => { const result = runUpstream(toolRoot, args); process.exitCode = result.status ?? 1 }
try {
    if (command === 'adu') {
        passthrough([target, ...rest].filter(value => value !== undefined))
    } else if (command === 'upstream' && target === 'verify') {
        const upstream = loadUpstream(toolRoot)
        console.log(JSON.stringify({ repository: upstream.lock.repository, commit: upstream.lock.commit, ...upstream.verification }, null, 2))
    } else if (command === 'create') {
        if (target === 'presenter') {
            if (rest.length !== 1) throw new Error('create presenter <new-project-folder>; use adu macro-plan/macro-build for existing full packs')
            console.log(JSON.stringify(createPresenterProject(toolRoot, rest[0]), null, 2))
        } else if (target === 'product') {
            if (rest.length !== 2) throw new Error('create product <project.json> <new-project-folder>')
            console.log(JSON.stringify(createProductProject(toolRoot, path.resolve(rest[0]), rest[1]), null, 2))
        } else throw new Error('Choose presenter or product for this production; both remain supported')
    } else if (command === 'export') {
        if (!target || rest.length !== 1) throw new Error('export <project-folder> <new-output.mp4>')
        const project = path.resolve(target), output = path.resolve(rest[0])
        if (fs.existsSync(path.join(project, 'product.json'))) console.log(JSON.stringify(renderProductProject(toolRoot, project, output), null, 2))
        else passthrough(['render', project, output])
    } else if (command === 'check-export') {
        if (!target || rest.length !== 1) throw new Error('check-export <project-folder> <output.mp4>')
        const result = runUpstream(toolRoot, [path.resolve(target), path.resolve(rest[0])], { entry: 'scripts/verify_delivery.py' })
        process.exitCode = result.status ?? 1
    } else if (command === 'doctor' && target === '--upstream') {
        passthrough(['doctor'])
    } else if (command === 'doctor') {
        const versions = Object.fromEntries(['ffmpeg', 'ffprobe'].map(program => [program, run(program, ['-version']).split('\n')[0]]))
        const encoders = run('ffmpeg', ['-hide_banner', '-encoders'])
        if (!encoders.includes('libx264') || !encoders.includes('ffv1')) throw new Error('FFmpeg requires libx264 and ffv1')
        const filters = run('ffmpeg', ['-hide_banner', '-filters'])
        if (!filters.includes('subtitles') || !filters.includes('sidechaincompress')) throw new Error('FFmpeg requires subtitles and sidechaincompress filters')
        const upstream = loadUpstream(toolRoot)
        const python = run(pythonExecutable(), ['--version']).trim()
        console.log(JSON.stringify({ ready: true, node: process.version, python, ...versions, upstream: { repository: upstream.lock.repository, commit: upstream.lock.commit, files: upstream.verification.checked }, networkCalled: false, note: 'Use doctor --upstream for the full upstream dependency report; pack-specific inputs remain required' }))
    } else if (command === 'init') {
        if (!target) throw new Error('Supply the consuming project video folder')
        const root = path.resolve(target)
        fs.mkdirSync(root, { recursive: true })
        if (fs.existsSync(path.join(root, 'project.json'))) throw new Error('Project already exists')
        fs.copyFileSync(path.join(toolRoot, 'templates/project.json'), path.join(root, 'project.json'), fs.constants.COPYFILE_EXCL)
        for (const directory of ['assets', 'sessions', 'deliverables']) fs.mkdirSync(path.join(root, directory), { recursive: true })
        console.log(JSON.stringify({ initialized: root, manifest: path.join(root, 'project.json'), next: 'Add authorized assets/recording.mp4; edit manifest; validate then render', readyToRender: false }))
    } else if (['validate', 'render', 'verify'].includes(command)) {
        if (!target) throw new Error('Supply project.json')
        const project = loadProject(path.resolve(target))
        const result = command === 'render' ? render(project) : command === 'verify' ? verify(project) : { valid: true, duration: project.duration, frames: project.frames, output: project.output, clipBounds: project.clips.map(clip => clip.bounds), subtitleCount: project.captions.length }
        console.log(JSON.stringify(result, null, 2))
    } else {
        console.log('Video Generator 0.2\nnode src/cli.mjs doctor [--upstream]\nnode src/cli.mjs upstream verify\nnode src/cli.mjs create presenter <new-project-folder>\nnode src/cli.mjs create product <project.json> <new-project-folder>\nnode src/cli.mjs export <project-folder> <new-output.mp4>\nnode src/cli.mjs check-export <project-folder> <output.mp4>\nnode src/cli.mjs adu <any-upstream-pipeline-command> [arguments...]\nLegacy 0.1 commands retained: init, validate, render, verify')
        if (command && command !== '--help') process.exitCode = 1
    }
} catch (error) {
    console.error(error.message)
    process.exitCode = 1
}