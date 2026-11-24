import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadUpstream, pythonExecutable } from '../src/upstream.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const upstream = loadUpstream(root)
const runtime = path.join(root, '.runtime/adu-python')
const windows = process.platform === 'win32'
const python = path.join(runtime, windows ? 'Scripts/python.exe' : 'bin/python')
function execute(command, args) {
    const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1' }, shell: false })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error('Runtime setup command failed')
}
if (!fs.existsSync(python)) {
    if (fs.existsSync(runtime)) throw new Error('Incomplete runtime exists; inspect it rather than overwrite')
    fs.mkdirSync(path.dirname(runtime), { recursive: true })
    execute(pythonExecutable(), ['-m', 'venv', runtime])
}
execute(python, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', path.join(upstream.source, 'requirements-runtime.txt')])
const link = path.join(upstream.source, windows ? '.venv-windows' : '.venv-posix')
let present = false
try { fs.lstatSync(link); present = true } catch (error) { if (error.code !== 'ENOENT') throw error }
if (present) {
    if (fs.realpathSync(link) !== fs.realpathSync(runtime)) throw new Error('Existing upstream runtime is not managed by this tool; not replacing it')
} else fs.symlinkSync(runtime, link, windows ? 'junction' : 'dir')
execute(python, ['-c', 'import numpy,PIL,cv2,scipy,fontTools;print("Audio/alignment modules ready")'])
const verification = loadUpstream(root).verification
const receipt = { runtime, python, link, sourceFilesChecked: verification.checked, upstreamUnmodified: true, scope: 'Local runtime dependencies and link; no locked source files modified' }
fs.mkdirSync(path.join(root, 'sessions'), { recursive: true })
fs.writeFileSync(path.join(root, 'sessions/runtime-setup.json'), JSON.stringify(receipt, null, 2))
console.log(JSON.stringify(receipt))