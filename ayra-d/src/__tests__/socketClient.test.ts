import { beforeEach, describe, expect, it, vi } from 'vitest'
import { io } from 'socket.io-client'
import { disconnectSocket, initSocket } from '@/lib/socketClient'
import { setAuthToken } from '@/lib/apiClient'

vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}))

function makeSocket() {
  const socket = {
    active: true,
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
  }
  socket.connect.mockReturnValue(socket)
  socket.disconnect.mockReturnValue(socket)
  return socket
}

describe('socketClient', () => {
  beforeEach(() => {
    disconnectSocket()
    localStorage.clear()
    localStorage.setItem('accessToken', 'access-one')
    vi.mocked(io).mockReset()
  })

  it('creates only one socket while several hooks initialize during connection', () => {
    const socket = makeSocket()
    vi.mocked(io).mockReturnValue(socket as any)

    const first = initSocket()
    const second = initSocket()
    const third = initSocket()

    expect(first).toBe(socket)
    expect(second).toBe(socket)
    expect(third).toBe(socket)
    expect(io).toHaveBeenCalledTimes(1)
    expect(socket.connect).not.toHaveBeenCalled()
  })

  it('reads the latest access token for each reconnect handshake', () => {
    const socket = makeSocket()
    vi.mocked(io).mockReturnValue(socket as any)
    initSocket()

    const options = vi.mocked(io).mock.calls[0][1] as any
    const auth = options.auth as (callback: (payload: { token: string | null }) => void) => void
    let payload: { token: string | null } | undefined

    auth((nextPayload) => {
      payload = nextPayload
    })
    expect(payload).toEqual({ token: 'access-one' })

    localStorage.setItem('accessToken', 'access-two')
    auth((nextPayload) => {
      payload = nextPayload
    })
    expect(payload).toEqual({ token: 'access-two' })
  })

  it('reconnects an inactive socket after an HTTP token refresh', () => {
    const socket = makeSocket()
    vi.mocked(io).mockReturnValue(socket as any)
    initSocket()
    socket.active = false

    setAuthToken('access-two')

    expect(socket.connect).toHaveBeenCalledTimes(1)
  })
})
