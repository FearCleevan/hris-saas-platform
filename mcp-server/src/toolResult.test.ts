import { describe, it, expect } from 'vitest'
import { errorResult, jsonResult, safeTool } from './toolResult.js'

describe('errorResult', () => {
  it('wraps the message and sets isError', () => {
    const result = errorResult('something broke')
    expect(result.isError).toBe(true)
    expect(result.content).toEqual([{ type: 'text', text: 'Error: something broke' }])
  })
})

describe('jsonResult', () => {
  it('pretty-prints the data as a text block', () => {
    const result = jsonResult({ a: 1, b: [2, 3] })
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify({ a: 1, b: [2, 3] }, null, 2) }])
  })

  it('sets isError to false', () => {
    expect(jsonResult({}).isError).toBe(false)
  })
})

describe('safeTool', () => {
  it('returns the handler result unchanged on success', async () => {
    const handler = safeTool(async () => jsonResult({ ok: true }))
    const result = await handler({})
    expect(result).toEqual(jsonResult({ ok: true }))
  })

  it('converts a thrown plain Error into a structured error result', async () => {
    const handler = safeTool(async () => {
      throw new Error('db exploded')
    })
    const result = await handler({})
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Error: db exploded')
  })

  it('never lets a thrown error escape as an uncaught rejection', async () => {
    const handler = safeTool(async () => {
      throw new Error('boom')
    })
    // If safeTool didn't catch this, the returned promise itself would
    // reject and this await would throw instead of resolving.
    await expect(handler({})).resolves.toBeDefined()
  })

  // The exact bug caught live via `npm run verify` against a placeholder DB
  // URL (see docs/mcp-server-design.md / project memory): Node's
  // AggregateError has an EMPTY top-level .message, so a naive
  // `err.message` extraction rendered as "Error: " with zero detail.
  it('extracts detail from an AggregateError instead of an empty message', async () => {
    const inner1 = Object.assign(new Error('connect ECONNREFUSED ::1:5432'), { code: 'ECONNREFUSED' })
    const inner2 = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' })
    const agg = new AggregateError([inner1, inner2], '')
    expect(agg.message).toBe('') // sanity-check the premise of the bug

    const handler = safeTool(async () => {
      throw agg
    })
    const result = await handler({})
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe(
      'Error: connect ECONNREFUSED ::1:5432; connect ECONNREFUSED 127.0.0.1:5432',
    )
  })

  it('recurses through a nested AggregateError', async () => {
    const leaf = new Error('leaf failure')
    const nested = new AggregateError([leaf], '')
    const outer = new AggregateError([nested], '')

    const handler = safeTool(async () => {
      throw outer
    })
    const result = await handler({})
    expect(result.content[0].text).toBe('Error: leaf failure')
  })

  it('falls back to name+code when a plain Error has an empty message', async () => {
    const err = Object.assign(new Error(''), { name: 'WeirdError', code: 'EWEIRD' })

    const handler = safeTool(async () => {
      throw err
    })
    const result = await handler({})
    expect(result.content[0].text).toBe('Error: WeirdError (EWEIRD)')
  })

  it('stringifies a non-Error throw', async () => {
    const handler = safeTool(async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'a bare string throw'
    })
    const result = await handler({})
    expect(result.content[0].text).toBe('Error: a bare string throw')
  })
})
