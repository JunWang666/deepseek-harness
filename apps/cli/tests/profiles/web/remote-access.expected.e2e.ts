/** Keyless Web profile access policy over the public CLI and real HTTP/WebSocket carriers. */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import WebSocket from 'ws'
import { expect, it } from 'vitest'

const repoRoot = fileURLToPath(new URL('../../../../../', import.meta.url))

it.each(['1', '0'])('Web remote administration with DSH_UNSAFE_ALLOW_REMOTE=%s', async (enabled) => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-access-'))
  const child = execa(process.execPath, [
    join(repoRoot, 'apps/cli/lib/bin.js'), '--profile', 'web', '--no-open', '--port', '0',
  ], {
    cwd: root,
    extendEnv: false,
    env: {
      ...Object.fromEntries(Object.entries(process.env).filter(([name]) =>
        !/(?:KEY|SECRET|TOKEN|PASSWORD|PROXY)/iu.test(name))),
      DSH_HOME: join(root, '.dsh'),
      DSH_AGENTS_HOME: join(root, '.agents'),
      DSH_UNSAFE_ALLOW_REMOTE: enabled,
      DSH_TELEMETRY_DISABLED: '1',
    },
    reject: false,
    timeout: 90_000,
    forceKillAfterDelay: 5_000,
  })
  let socket: WebSocket | undefined
  try {
    const ready = new Promise<string>((resolve, reject) => {
      let output = ''
      child.stdout?.on('data', (chunk: Buffer) => {
        output += chunk.toString()
        const match = /dsh web: (http:\/\/[^\s]+)/u.exec(output)
        if (match?.[1] !== undefined) resolve(match[1])
      })
      void child.then((result) => { reject(new Error(`Web exited before readiness: ${result.stderr}`)) }, reject)
    })
    const url = new URL(await ready)
    const headers = { host: `203.0.113.10:${url.port}`, origin: 'https://remote.example', 'sec-fetch-site': 'cross-site' }
    const index = await fetch(url.origin, { headers, redirect: 'manual' })
    const html = await index.text()
    const api = await fetch(`${url.origin}/api/settings/describe`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'remote-access', method: 'settings/describe', payload: { args: {} } }),
    })
    const apiBody: unknown = api.status === 200 ? await api.json() : await api.text()
    socket = new WebSocket(`${url.origin.replace('http:', 'ws:')}/api/remote.mux`, { headers })
    const upgradeStatus = await new Promise<number>((resolve, reject) => {
      socket!.once('open', () => { resolve(101) })
      socket!.once('unexpected-response', (_req, res) => {
        res.resume()
        resolve(res.statusCode ?? 0)
      })
      socket!.once('error', reject)
    })
    expect({
      token: url.searchParams.has('token'),
      index: index.status,
      remoteControls: html.includes('__DSH_UNSAFE_ALLOW_REMOTE__'),
      api: api.status,
      upgrade: upgradeStatus,
    }).toEqual(enabled === '1'
      ? { token: false, index: 200, remoteControls: true, api: 200, upgrade: 101 }
      : { token: true, index: 401, remoteControls: false, api: 403, upgrade: 403 })
    if (enabled === '1') expect(apiBody).toMatchObject({ result: { ok: true, value: { namespaces: expect.any(Array) as unknown } } })
  } finally {
    if (socket !== undefined && socket.readyState !== WebSocket.CLOSED) {
      const closed = new Promise<void>((resolve) => { socket!.once('close', () => { resolve() }) })
      socket.terminate()
      await closed
    }
    child.kill('SIGTERM')
    await child
    await rm(root, { recursive: true, force: true })
  }
})
