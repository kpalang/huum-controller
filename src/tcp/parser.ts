const parseUnixTimestampLE = (buffer: Uint8Array, offset: number): Date | null => {
    const bytes = buffer.slice(offset, offset + 4)
    const timestamp = bytes[0]! | (bytes[1]! << 8) | (bytes[2]! << 16) | (bytes[3]! << 24)

    if (timestamp === 0) {
        return null
    }

    return new Date(timestamp * 1000)
}

const toHex = (buffer: Uint8Array): string => Buffer.from(buffer).toString('hex')

const SENSOR_STATUS_LABELS: Record<number, SensorStatusLabel> = {
    0x21: 'Status21',
    0x22: 'Status22',
    0x23: 'OnlineNotHeating',
    0x24: 'OnlineHeating',
    0x25: 'OnlineNotHeating',
    0x26: 'Status26',
}

const HEARTBEAT_MISS_THRESHOLD = 3

const parseStateUpdate = (buffer: Uint8Array): CloudUpdate | ControlUpdate => {
    const lightStateFlag = buffer[3] ?? 0
    const accessoryConfigFlag = buffer[5] ?? 0

    return {
        messageType: buffer[0] ?? 0,
        targetTemperature: buffer[1] ?? 0,
        lightOn: lightStateFlag !== 0,
        lightConfigured: (accessoryConfigFlag & 0x02) !== 0,
        steamerConfigured: (accessoryConfigFlag & 0x01) !== 0,
        flags: {
            reserved: [buffer[2] ?? 0, buffer[4] ?? 0],
            lightState: lightStateFlag,
            accessoryConfig: accessoryConfigFlag,
            mode: buffer[6] ?? 0,
            tail: Array.from(buffer.slice(19, 23)),
            trailer: Array.from(buffer.slice(23)),
        },
        heatingStartedAt: parseUnixTimestampLE(buffer, 7),
        heatingEndsAt: parseUnixTimestampLE(buffer, 11),
        reportedAt: parseUnixTimestampLE(buffer, 15),
        rawHex: toHex(buffer),
    }
}

export const getSensorStatusLabel = (rawStatus: number | undefined): SensorStatusLabel | undefined => {
    if (rawStatus === undefined) {
        return undefined
    }

    return SENSOR_STATUS_LABELS[rawStatus]
}

export const hasHeatingWindow = (
    update: Pick<CloudUpdate | ControlUpdate, 'heatingStartedAt' | 'heatingEndsAt'> | undefined
): boolean => {
    if (!update) {
        return false
    }

    return update.heatingStartedAt !== null && update.heatingEndsAt !== null
}

export const deriveSessionHeaterStatus = (
    update: Pick<CloudUpdate | ControlUpdate, 'heatingStartedAt' | 'heatingEndsAt'> | undefined
): HeaterStatus => {
    if (!update) {
        return 'Unknown'
    }

    return hasHeatingWindow(update) ? 'OnlineHeating' : 'OnlineNotHeating'
}

export const getEffectiveHeaterStatus = (
    state: Pick<ControllerState, 'heaterStatus' | 'sensorReading' | 'lastHeartbeatAt'>,
    fallbackHeartbeatFrequencySeconds: number,
    now = new Date()
): HeaterStatus => {
    if (!state.lastHeartbeatAt) {
        return state.heaterStatus ?? 'Unknown'
    }

    const heartbeatFrequencySeconds = state.sensorReading?.frequencySeconds ?? fallbackHeartbeatFrequencySeconds

    if (heartbeatFrequencySeconds <= 0) {
        return state.heaterStatus ?? 'Unknown'
    }

    const offlineThresholdMs = heartbeatFrequencySeconds * HEARTBEAT_MISS_THRESHOLD * 1000
    const msSinceLastHeartbeat = now.getTime() - state.lastHeartbeatAt.getTime()

    if (msSinceLastHeartbeat > offlineThresholdMs) {
        return 'Offline'
    }

    return state.heaterStatus ?? 'Unknown'
}

export const parseSensorReading = (buffer: Uint8Array): SensorUpdate => {
    const rawDoorFlag = buffer[2]
    const rawStatus = buffer[4]

    return {
        temperature: buffer[1] ?? 0,
        frequencySeconds: buffer[3] ?? 0,
        rawDoorFlag,
        rawDoorFlagHex: rawDoorFlag === undefined ? undefined : `0x${rawDoorFlag.toString(16).padStart(2, '0')}`,
        doorOpen: rawDoorFlag === undefined ? undefined : rawDoorFlag !== 0,
        rawStatus,
        rawStatusHex: rawStatus === undefined ? undefined : `0x${rawStatus.toString(16).padStart(2, '0')}`,
        rawStatusLabel: getSensorStatusLabel(rawStatus),
    }
}

export const parseCloudUpdate = (buffer: Uint8Array): CloudUpdate => {
    return parseStateUpdate(buffer) as CloudUpdate
}

export const parseControlUpdate = (buffer: Uint8Array): ControlUpdate =>
    parseStateUpdate(buffer) as ControlUpdate
