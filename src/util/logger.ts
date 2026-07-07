/**
 * Protocol logger for reverse engineering and debugging
 * Enable via DEBUG_PROTOCOL=1 environment variable
 */

const DEBUG_PROTOCOL = process.env.DEBUG_PROTOCOL === '1'

type Direction = 'incoming' | 'outgoing'

interface LogOptions {
    messageId?: number
    direction: Direction
    timestamp?: Date
}

function formatHex(buffer: Uint8Array | Buffer): string {
    return Buffer.from(buffer).toString('hex').toUpperCase()
}

function formatMessageId(id: number): string {
    return '0x' + id.toString(16).padStart(2, '0').toUpperCase()
}

export function logMessage(buffer: Uint8Array | Buffer, options: LogOptions): void {
    if (!DEBUG_PROTOCOL) return

    const timestamp = options.timestamp?.toISOString() || new Date().toISOString()
    const direction = options.direction === 'incoming' ? '📥' : '📤'
    const messageId = options.messageId ?? buffer[0]
    const hex = formatHex(buffer)
    const length = buffer.length

    console.log(
        `[${direction} ${timestamp}] Message ID: ${formatMessageId(messageId)} | Length: ${length} | Hex: ${hex}`
    )
}

export function logIncoming(buffer: Uint8Array | Buffer, timestamp?: Date): void {
    logMessage(buffer, {
        direction: 'incoming',
        messageId: buffer[0],
        timestamp,
    })
}

export function logOutgoing(buffer: Uint8Array | Buffer, timestamp?: Date): void {
    logMessage(buffer, {
        direction: 'outgoing',
        messageId: buffer[0],
        timestamp,
    })
}

export function isDebugEnabled(): boolean {
    return DEBUG_PROTOCOL
}
