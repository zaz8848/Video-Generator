import Ajv from 'ajv'

const file = { type: 'string', minLength: 1, maxLength: 1024 }
const time = { type: 'number', minimum: 0, maximum: 86400 }
const crop = {
    type: 'object', additionalProperties: false, required: ['x', 'y', 'width', 'height'],
    properties: { x: { type: 'integer', minimum: 0 }, y: { type: 'integer', minimum: 0 }, width: { type: 'integer', minimum: 1 }, height: { type: 'integer', minimum: 1 } }
}
export const schema = {
    type: 'object', additionalProperties: false, required: ['version', 'name', 'width', 'height', 'fps', 'inset', 'background', 'output', 'clips', 'narration'],
    properties: {
        version: { const: 1 }, name: { type: 'string', minLength: 1, maxLength: 120 },
        width: { type: 'integer', minimum: 320, maximum: 4096, multipleOf: 2 }, height: { type: 'integer', minimum: 240, maximum: 4096, multipleOf: 2 },
        fps: { type: 'integer', minimum: 1, maximum: 60 }, inset: { type: 'integer', minimum: 0, maximum: 512 },
        background: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }, output: file,
        clips: {
            type: 'array', minItems: 1, maxItems: 100,
            items: {
                type: 'object', additionalProperties: false, required: ['mode', 'source', 'duration'], properties: {
                    mode: { enum: ['play', 'freeze', 'image'] }, source: file, in: time,
                    duration: { type: 'number', exclusiveMinimum: 0, maximum: 3600 }, crop
                }
            }
        },
        narration: {
            type: 'array', maxItems: 100,
            items: { type: 'object', additionalProperties: false, required: ['source', 'at'], properties: { source: file, at: time, metadata: file } }
        },
        music: {
            type: 'object', additionalProperties: false, required: ['source', 'license'],
            properties: { source: file, license: file, gain: { type: 'number', minimum: 0, maximum: 1 } }
        }
    }
}
const compiled = new Ajv({ allErrors: true }).compile(schema)
export function validateSchema(plan) {
    if (!compiled(plan)) throw new Error('Invalid project: ' + compiled.errors.map(error => `${error.instancePath} ${error.message}`).join('; '))
    if (2 * plan.inset >= Math.min(plan.width, plan.height)) throw new Error('Inset leaves no image area')
    return plan
}