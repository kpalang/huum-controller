const validateSteamerIntensity = (steamerIntensity: number) => {
    if (!Number.isInteger(steamerIntensity) || steamerIntensity < 0 || steamerIntensity > 10) {
        throw new Error(`Invalid steamer intensity ${steamerIntensity}. Must be an integer between 0 and 10`)
    }
}

const buildStateControlPacket = (
    targetTemp: number,
    steamerIntensity: number,
    lightOn: boolean,
    accessoryConfig: number,
    date: Date = new Date()
) => {
    validateSteamerIntensity(steamerIntensity)

    const buffer = new Uint8Array(24)

    buffer[0] = 0x07
    buffer[1] = targetTemp
    buffer[2] = steamerIntensity
    buffer[3] = lightOn ? 0x01 : 0x00
    buffer[5] = accessoryConfig
    buffer[6] = 0x03
    buffer.set(dateToHexLE(date), 15)

    return buffer
}

const heaterOn = (
    targetTemp: number = 90,
    durationHours: number = 3,
    lightOn: boolean = false,
    steamerIntensity: number = 0,
    accessoryConfig: number = 0x02
): Uint8Array => {
    const turnOnTime = new Date()
    const turnOffTime = new Date()
    turnOffTime.setHours(turnOffTime.getHours() + durationHours)

    const buffer = buildStateControlPacket(targetTemp, steamerIntensity, lightOn, accessoryConfig, turnOnTime)
    buffer.set(dateToHexLE(turnOnTime), 7)
    buffer.set(dateToHexLE(turnOffTime), 11)
    buffer.set([0xEC, 0xC5, 0xEF, 0x10], 19)

    return buffer
}

const lightControl = (
    lightOn: boolean,
    targetTemp: number = 0x41,
    steamerIntensity: number = 0,
    accessoryConfig: number = 0x02,
    heatingStartedAt: Date | null = null,
    heatingEndsAt: Date | null = null,
    date: Date = new Date()
): Uint8Array => {
    const buffer = buildStateControlPacket(targetTemp, steamerIntensity, lightOn, accessoryConfig, date)
    if (heatingStartedAt) {
        buffer.set(dateToHexLE(heatingStartedAt), 7)
    }
    if (heatingEndsAt) {
        buffer.set(dateToHexLE(heatingEndsAt), 11)
    }

    return buffer
}

const heaterOff = (
    targetTemp: number = 90,
    lightOn: boolean = false,
    steamerIntensity: number = 0,
    accessoryConfig: number = 0x02,
    date: Date = new Date()
): Uint8Array => {
    const buffer = buildStateControlPacket(targetTemp, steamerIntensity, lightOn, accessoryConfig, date)
    buffer.set([0x75, 0x59, 0xFC, 0x10], 19) // Unknown values

    return buffer
}

const steamerControl = (
    steamerIntensity: number,
    targetTemp: number = 0x41,
    lightOn: boolean = false,
    accessoryConfig: number = 0x00,
    heatingStartedAt: Date | null = null,
    heatingEndsAt: Date | null = null,
    date: Date = new Date()
): Uint8Array => {
    const buffer = buildStateControlPacket(targetTemp, steamerIntensity, lightOn, accessoryConfig, date)

    if (heatingStartedAt) {
        buffer.set(dateToHexLE(heatingStartedAt), 7)
    }
    if (heatingEndsAt) {
        buffer.set(dateToHexLE(heatingEndsAt), 11)
    }

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
    lightControl,
    steamerControl,
    frequencyUpdate,
    dateToHexLE
}
