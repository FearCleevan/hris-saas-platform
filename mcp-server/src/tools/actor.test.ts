import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeServer, resultJson } from '../testSupport/fakeServer.js'

const resolveActorMock = vi.fn()
vi.mock('../actor.js', () => ({ resolveActor: resolveActorMock }))

describe('simulate_actor tool', () => {
  beforeEach(() => {
    resolveActorMock.mockReset()
  })

  it('is registered with the expected name', async () => {
    const { registerActorTools } = await import('./actor.js')
    const { server, toolNames } = createFakeServer()
    registerActorTools(server)
    expect(toolNames()).toEqual(['simulate_actor'])
  })

  it('resolves the actor and returns it as the tool result', async () => {
    const { registerActorTools } = await import('./actor.js')
    const { server, getTool } = createFakeServer()
    registerActorTools(server)

    const actor = { sub: 'u1', email: 'peter@peterpaullazan.com', org_id: 'org-a', user_role: 'super_admin' }
    resolveActorMock.mockResolvedValue(actor)

    const result = await getTool('simulate_actor').handler({ email: 'peter@peterpaullazan.com' })

    expect(resolveActorMock).toHaveBeenCalledWith('peter@peterpaullazan.com')
    expect(resultJson(result)).toEqual(actor)
  })

  it('surfaces resolveActor errors as a structured tool error, not a crash', async () => {
    const { registerActorTools } = await import('./actor.js')
    const { server, getTool } = createFakeServer()
    registerActorTools(server)

    resolveActorMock.mockRejectedValue(new Error('No auth.users row found for email "x@example.com".'))

    const result = await getTool('simulate_actor').handler({ email: 'x@example.com' })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('No auth.users row found')
  })
})
