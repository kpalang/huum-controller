const heaterOn = (targetTemp: number = 90, durationHours: number = 3): Uint8Array => {
    const buffer = new Uint8Array(24)

    // Header
    buffer[0] = 0x07 // Message type: "Turn On"
    buffer[1] = targetTemp // Target temperature (°C)
    buffer[6] = 0x03 // Unknown value

    const turnOnTime = new Date()
    const turnOffTime = new Date()
    turnOffTime.setHours(turnOffTime.getHours() + durationHours)

    buffer.set(dateToHexLE(turnOnTime), 7)
    buffer.set(dateToHexLE(turnOffTime), 11)
    buffer.set(dateToHexLE(turnOnTime), 15)

    buffer.set([0xEC, 0xC5, 0xEF, 0x10], 19)

    return buffer
}

const heaterOff = (targetTemp: number = 90, date: Date = new Date()): Uint8Array => {
    const buffer = new Uint8Array(24)

    // Header
    buffer[0] = 0x07 // Message type: "Turn Off"
    buffer[1] = targetTemp // Target temperature (°C)
    buffer[6] = 0x03 // Unknown value
    buffer.set(dateToHexLE(date), 15)
    buffer.set([0x75, 0x59, 0xFC, 0x10], 19) // Unknown values

    return buffer
}

const frequencyUpdate = (delaySeconds: number, date: Date = new Date()) => {
    if (delaySeconds < 0 || delaySeconds > 255) {
        throw new Error(`Invalid frequency ${delaySeconds}. Must be between 0 and 255`)
    }

    const buffer = new Uint8Array(7)

    buffer[0] = 0x02 // Message type: "Update ping frequency"
    buffer.set(dateToHexLE(date), 1)
    buffer[5] = delaySeconds // Delay in seconds

    return buffer
}

const dateToHexLE = (date: Date): Uint8Array => {
    const timestamp = Math.floor(date.getTime() / 1000)
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)

    view.setUint32(0, timestamp, true)

    return new Uint8Array(buffer)
}

export {
    heaterOn,
    heaterOff,
    frequencyUpdate,
    dateToHexLE
}