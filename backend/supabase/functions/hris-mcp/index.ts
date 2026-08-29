// Phase 3 scaffold (docs/mcp-server-v2-design.md section 6): proves
// claude.ai will accept this as a Custom Connector at all. Deliberately
// TOOLS = [] — no real tool logic wired in yet, that's Phase 4, using the
// ToolDef arrays mcp-server/src/tools/*.ts already exports (Phase 2).
import { z } from 'npm:zod@4'
import { CORS, jsonRpcResult, jsonRpcError } from './jsonRpc.ts'
import { checkAuth } from './auth.ts'
import {
  handleMetadata,
  handleProtectedResourceMetadata,
  handleRegister,
  handleAuthorizeGet,
  handleAuthorizePost,
  handleToken,
  protectedResourceMetadataUrl,
} from './oauth.ts'

const SERVER_INFO = { name: 'hris-mcp', version: '0.1.0' }

// deno-lint-ignore no-explicit-any
const TOOLS: { name: string; description: string; schema: Record<string, any>; handler: (args: any) => Promise<unknown> }[] = []

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const pathname = new URL(req.url).pathname

  if (req.method === 'GET' && pathname.endsWith('/.well-known/oauth-authorization-server')) {
    return handleMetadata(req)
  }
  if (req.method === 'GET' && pathname.endsWith('/.well-known/oauth-protected-resource')) {
    return handleProtectedResourceMetadata(req)
  }
  if (req.method === 'POST' && pathname.endsWith('/register')) {
    return handleRegister(req)
  }
  if (req.method === 'GET' && pathname.endsWith('/authorize')) {
    return handleAuthorizeGet(req)
  }
  if (req.method === 'POST' && pathname.endsWith('/authorize')) {
    return handleAuthorizePost(req)
  }
  if (req.method === 'POST' && pathname.endsWith('/token')) {
    return handleToken(req)
  }

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS })

  if (!(await checkAuth(req))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer resource_metadata="${protectedResourceMetadataUrl()}"`,
      },
    })
  }

  let rpc: { jsonrpc?: string; id?: unknown; method?: string; params?: any }
  try {
    rpc = await req.json()
  } catch {
    return jsonRpcError(null, -32700, 'Parse error')
  }

  const { id, method, params } = rpc

  // JSON-RPC notifications (no id) never get a response body.
  if (id === undefined) {
    return new Response(null, { status: 202, headers: CORS })
  }

  switch (method) {
    case 'initialize': {
      return jsonRpcResult(id, {
        protocolVersion: params?.protocolVersion ?? '2025-06-18',
        serverInfo: SERVER_INFO,
        capabilities: { tools: {} },
      })
    }
    case 'tools/list': {
      return jsonRpcResult(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: z.toJSONSchema(z.object(t.schema)),
        })),
      })
    }
    case 'tools/call': {
      const toolName = params?.name
      const tool = TOOLS.find((t) => t.name === toolName)
      if (!tool) return jsonRpcError(id, -32602, `Unknown tool: ${toolName}`)

      const parsed = z.object(tool.schema).safeParse(params?.arguments ?? {})
      if (!parsed.success) {
        return jsonRpcResult(id, {
          content: [{ type: 'text', text: `Error: invalid arguments: ${parsed.error.message}` }],
          isError: true,
        })
      }

      const result = await tool.handler(parsed.data)
      return jsonRpcResult(id, result)
    }
    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`)
  }
})
