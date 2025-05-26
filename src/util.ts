export function parseControllerHandshake (payload: Uint8Array): Handshake {
    const macBytes = payload.slice(1, 7)
    const macAddress = Array.from(macBytes)
        .reverse()
        .map(b => b.toString(16).padStart(2, '0'))
        .join(':')

    const firmwareBytes = payload.slice(32, 57)
    const firmware = Buffer.from(firmwareBytes).toString('utf-8').replace(/\0/g, '').trim()

    const nameBytes = payload.slice(62, 73)
    const deviceName = Buffer.from(nameBytes).toString('utf-8').replace(/\0/g, '').trim()

    return {
        macAddress,
        firmware,
        deviceName,
    }
}

export function printArrayAsHex(bytes: Buffer | Uint8Array) {
    const hexBytes = Array.from(bytes, b => b.toString(16).padStart(2, '0'))
    console.log('Byte Array:', bytes)
    console.log('Hex LE:', hexBytes.join(' '))
}