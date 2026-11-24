import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { parseArgs, parseEnv } from 'node:util'
import { fileURLToPath } from 'node:url'

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const endpoint = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse'

function parseEvent(block) {
    const data = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
    return data ? JSON.parse(data) : null
}

function consumeEvents(buffer, consume, final = false) {
    const blocks = buffer.replaceAll('\r\n', '\n').split('\n\n')
    const remainder = blocks.pop()
    for (const block of blocks) {
        const event = parseEvent(block)
        if (event) consume(event)
    }
    if (final && remainder.trim()) {
        const event = parseEvent(remainder)
        if (event) consume(event)
        return ''
    }
    return remainder
}

function makeCaptions(sentences) {
    const captions = []
    for (const sentence of sentences) {
        if (!Array.isArray(sentence.words)) continue
        const words = sentence.words
        if (words.length === 0) continue
        if (!words.every(word => Number.isFinite(word.startTime) && Number.isFinite(word.endTime) && word.startTime >= 0 && word.endTime > word.startTime && typeof word.word === 'string')) continue
        const caption = { start: words[0].startTime, end: words.at(-1).endTime, text: words.map(word => word.word).join('') }
        if (caption.end <= caption.start || !caption.text.trim()) continue
        captions.push(caption)
    }
    captions.sort((first, second) => first.start - second.start)
    return captions.filter((caption, index) => index === 0 || caption.start >= captions[index - 1].end)
}

function srtTime(seconds) {
    const milliseconds = Math.round(seconds * 1000)
    return `${String(Math.floor(milliseconds / 3600000)).padStart(2, '0')}:${String(Math.floor(milliseconds / 60000) % 60).padStart(2, '0')}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')},${String(milliseconds % 1000).padStart(3, '0')}`
}

async function main() {
    const { values } = parseArgs({
        options: {
            check: { type: 'boolean' }, 'self-check': { type: 'boolean' }, text: { type: 'string' },
            'text-file': { type: 'string' }, output: { type: 'string' }, speaker: { type: 'string' },
            rate: { type: 'string', default: '0' }, 'env-file': { type: 'string' },
            'max-characters': { type: 'string', default: '1000' }
        }
    })
    if (values['self-check']) {
        const events = []
        let pending = consumeEvents('event: 352\r\ndata: {"code":0,"da', event => events.push(event))
        pending = consumeEvents(pending + 'ta":"YQ=="}\r\n\r\nevent: 152\r\ndata: {"code":20000000}\r\n\r\n', event => events.push(event), true)
        assert.equal(pending, '')
        assert.equal(events.length, 2)
        assert.equal(Buffer.from(events[0].data, 'base64').toString(), 'a')
        assert.equal(events[1].code, 20000000)
        const captions = makeCaptions([{ words: [{ startTime: 0.1, endTime: 0.6, word: 'sample' }] }])
        assert.deepEqual(captions, [{ start: 0.1, end: 0.6, text: 'sample' }])
        assert.equal(srtTime(61.125), '00:01:01,125')
        assert.deepEqual(makeCaptions([{ text: 'no timestamps' }]), [])
        console.log(JSON.stringify({ offlineCheck: 'PASS', networkCalled: false, checks: ['split SSE chunks', 'CRLF', 'audio decode', 'terminal code', 'real timestamp captions', 'missing timestamps'] }))
        return
    }
    const envFile = path.resolve(values['env-file'] ?? path.join(toolRoot, 'profiles/tts.local.env'))
    const local = fs.existsSync(envFile) ? parseEnv(fs.readFileSync(envFile, 'utf8')) : {}
    const apiKey = process.env.VOLCENGINE_TTS_API_KEY ?? local.VOLCENGINE_TTS_API_KEY
    const resource = process.env.VOLCENGINE_TTS_RESOURCE_ID ?? local.VOLCENGINE_TTS_RESOURCE_ID ?? 'seed-tts-2.0'
    const userId = process.env.VOLCENGINE_TTS_USER_ID ?? local.VOLCENGINE_TTS_USER_ID ?? 'product-video'
    if (typeof apiKey !== 'string' || !/^[A-Za-z0-9_-]{24,256}$/.test(apiKey)) throw new Error('Missing or invalid VOLCENGINE_TTS_API_KEY; configure profiles/tts.local.env or --env-file')
    if (resource !== 'seed-tts-2.0') throw new Error('This generator targets verified seed-tts-2.0 resources only')
    if (values.check) {
        console.log(JSON.stringify({ ready: true, credentialSource: process.env.VOLCENGINE_TTS_API_KEY ? 'process environment' : 'explicit or tool-local env file', resource, endpoint, networkCalled: false }))
        return
    }
    if (Boolean(values.text) === Boolean(values['text-file'])) throw new Error('Supply exactly one of --text or --text-file')
    const text = values['text-file'] ? fs.readFileSync(path.resolve(values['text-file']), 'utf8').replace(/^\uFEFF/, '').trim() : values.text.trim()
    const limit = Number(values['max-characters']), characters = [...text].length
    if (!Number.isSafeInteger(limit) || limit < 1 || characters === 0 || characters > limit) throw new Error('Text is empty or exceeds the explicit local character budget')
    const rate = Number(values.rate)
    if (!Number.isFinite(rate) || rate < -50 || rate > 100) throw new Error('Speech rate must be between -50 and 100')
    const speaker = values.speaker ?? process.env.VOLCENGINE_TTS_SPEAKER ?? local.VOLCENGINE_TTS_SPEAKER
    if (!speaker) throw new Error('Missing speaker; select an official voice using --speaker or VOLCENGINE_TTS_SPEAKER')
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(speaker)) throw new Error('Invalid speaker ID')
    if (!values.output) throw new Error('Provide --output with an independent file prefix')
    const prefix = path.resolve(values.output)
    const files = { audio: prefix + '.mp3', metadata: prefix + '.json', subtitle: prefix + '.srt' }
    const protectedInput = path.resolve(values['text-file'] ?? envFile)
    if (Object.values(files).includes(protectedInput) || Object.values(files).includes(envFile)) throw new Error('Refusing to overwrite an input or credential file')
    for (const file of Object.values(files)) if (fs.existsSync(file)) throw new Error('Refusing to overwrite an existing output')
    const requestId = crypto.randomUUID()
    const response = await fetch(endpoint, {
        method: 'POST', signal: AbortSignal.timeout(90000), headers: {
            'Content-Type': 'application/json', 'X-Api-Key': apiKey, 'X-Api-Resource-Id': resource,
            'X-Api-Request-Id': requestId, 'X-Control-Require-Usage-Tokens-Return': '*'
        }, body: JSON.stringify({
            user: { uid: userId }, req_params: {
                text, speaker,
                audio_params: { format: 'mp3', sample_rate: 24000, speech_rate: rate, enable_subtitle: true },
                additions: JSON.stringify({ aigc_metadata: { enable: true } })
            }
        })
    })
    if (!response.ok) throw new Error(`TTS HTTP ${response.status}; check project, Key, resource and quota; not automatically retried`)
    if (!response.body) throw new Error('TTS returned no response stream')
    const decoder = new TextDecoder(), audio = [], sentences = []
    let pending = '', completed = false, usage = null
    const consume = event => {
        if (event.code !== 0 && event.code !== 20000000) throw new Error(`TTS service code ${event.code}; not automatically retried`)
        if (typeof event.data === 'string' && event.data.length) {
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(event.data)) throw new Error('Invalid audio Base64')
            audio.push(Buffer.from(event.data, 'base64'))
        }
        if (event.sentence && typeof event.sentence === 'object') sentences.push(event.sentence)
        if (event.code === 20000000) { completed = true; usage = event.usage ?? null }
    }
    for await (const chunk of response.body) pending = consumeEvents(pending + decoder.decode(chunk, { stream: true }), consume)
    consumeEvents(pending + decoder.decode(), consume, true)
    if (!completed || audio.length === 0) throw new Error('TTS ended without successful terminal code or audio; no output written')
    const bytes = Buffer.concat(audio)
    if (bytes.length === 0) throw new Error('TTS returned empty audio')
    const captions = makeCaptions(sentences)
    const metadata = {
        provider: 'Volcengine Doubao official TTS', endpoint, resource, speaker, rate, text, characters,
        requestId, logId: response.headers.get('x-tt-logid'), generatedAt: new Date().toISOString(),
        successCode: 20000000, usage, audioBytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        subtitleStatus: captions.length ? 'service-returned word times grouped by sentence' : 'not returned; no fabricated timestamps', captions, sentences,
        listeningApproval: 'pending user listening'
    }
    fs.mkdirSync(path.dirname(prefix), { recursive: true })
    fs.writeFileSync(files.audio, bytes, { flag: 'wx' })
    fs.writeFileSync(files.metadata, JSON.stringify(metadata, null, 2), { flag: 'wx' })
    if (captions.length) fs.writeFileSync(files.subtitle, captions.map((caption, index) => `${index + 1}\n${srtTime(caption.start)} --> ${srtTime(caption.end)}\n${caption.text}\n`).join('\n'), { flag: 'wx' })
    console.log(JSON.stringify({
        generated: true, audio: files.audio, metadata: files.metadata, subtitle: captions.length ? files.subtitle : null,
        audioBytes: bytes.length, speaker, characters, usage, successCode: 20000000, subtitleStatus: metadata.subtitleStatus
    }))
}

main().catch(error => {
    const message = error instanceof Error ? error.message : 'TTS generation failed'
    console.error(message.startsWith('TTS') || message.startsWith('Missing') || message.startsWith('Refusing') ? message : `Generation failed: ${error.code ?? error.name ?? 'unknown error'}`)
    process.exitCode = 1
})