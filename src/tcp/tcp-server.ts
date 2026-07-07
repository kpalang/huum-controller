import {MessageType} from './enums.ts'
import {parseControllerHandshake} from '../util.ts'
import {deriveSessionHeaterStatus, getEffectiveHeaterStatus, parseCloudUpdate, parseControlUpdate, parseSensorReading} from './parser.ts'
import * as msgBuilder from './msgBuilder.ts'
import {logIncoming, logOutgoing} from '../util/logger.ts'

import {HuumEvents, UserEvents} from '../events/eventEnum.ts'
import eventBus from '../events/eventbus.ts'

let heaterTcpSocket: Bun.TCPSocket | undefined
export const controllerState: ControllerState = {}
let previousCloudUpdateHex: string | undefined

const TCP_PORT = 6969 // Must not be changed
const TCP_HOSTNAME = process.env.TCP_HOSTNAME || '0.0.0.0'

const pingFrequencySeconds = Number(process.env.UPDATE_FREQUENCY) || 60
const logPacketDiff = (previousHex: string | undefined, currentHex: string) => {
    if (!previousHex) {
        console.log('[0x08 diff] First cloud update captured')
        return
    }

    const previous = Buffer.from(previousHex, 'hex')
    const current = Buffer.from(currentHex, 'hex')
    const maxLength = Math.max(previous.length, current.length)
    const changedBytes: string[] = []

    for (let index = 0; index < maxLength; index++) {
        const oldValue = previous[index]
        const newValue = current[index]

        if (oldValue === newValue) {
            continue
        }

        changedBytes.push(
            `byte ${index}: ${oldValue?.toString(16).padStart(2, '0') ?? '--'} -> ${newValue?.toString(16).padStart(2, '0') ?? '--'}`
        )
    }

    if (changedBytes.length === 0) {
        console.log('[0x08 diff] No byte-level changes')
        return
    }

    console.log(`[0x08 diff] ${changedBytes.join(', ')}`)
}

const getKnownTargetTemperature = () => controllerState.cloudUpdate?.targetTemperature ?? 0x41

const getKnownAccessoryConfig = () => controllerState.cloudUpdate?.flags.accessoryConfig ?? 0x00

const getKnownLightState = () => controllerState.cloudUpdate?.lightOn ?? false

const getKnownHeatingWindow = () => ({
    heatingStartedAt: controllerState.cloudUpdate?.heatingStartedAt ?? null,
    heatingEndsAt: controllerState.cloudUpdate?.heatingEndsAt ?? null,
})

Bun.listen({
    port: TCP_PORT,
    hostname: TCP_HOSTNAME,
    socket: {
        open(socket) {
            console.log('[+] New TCP client connected')
            heaterTcpSocket = socket
        },

        data(socket, buffer) {
            logIncoming(buffer)
            const messageType = buffer[0]

            switch (messageType) {
                case MessageType.HANDSHAKE:
                    eventBus.emit(HuumEvents.HANDSHAKE, buffer)
                    break
                case MessageType.SENSOR_READING:
                    eventBus.emit(HuumEvents.SENSOR_READING, parseSensorReading(buffer))
                    break
                case MessageType.LOCAL_HEATER_CONTROL:
                    eventBus.emit(HuumEvents.LOCAL_HEATER_CONTROL, parseControlUpdate(buffer))
                    break
                case MessageType.CLOUD_UPDATE:
                    eventBus.emit(HuumEvents.CLOUD_UPDATE, parseCloudUpdate(buffer))
                    break
                default:
                    console.log('[📥 Received data]', buffer.toString('hex'))
                    break
            }
        },

        close(socket) {
            heaterTcpSocket = undefined
            console.log('[-] TCP client disconnected')
        },

        error(socket, error) {
            heaterTcpSocket = undefined
            console.error('[!] Socket error:', error)
        },
    },
})

eventBus.on(HuumEvents.SENSOR_READING, (update: SensorUpdate) => {
    controllerState.sensorReading = {
        ...controllerState.sensorReading,
        ...update,
    }
    controllerState.lastHeartbeatAt = new Date()

    console.log(`Sensor reading: ${JSON.stringify({
        ...controllerState.sensorReading,
        resolvedHeaterStatus: getEffectiveHeaterStatus(controllerState, pingFrequencySeconds),
    })}`)
})

eventBus.on(HuumEvents.HANDSHAKE, (buffer: Buffer) => {
    const handshake = parseControllerHandshake(buffer)
    controllerState.handshake = handshake
    console.log(`Handshake: ${JSON.stringify(handshake)}`)

    eventBus.emit(HuumEvents.CONFIGURATION)
})

eventBus.on(HuumEvents.CONFIGURATION, () => {
    // Ask the controller for a status update
    if (heaterTcpSocket) {
        const message = msgBuilder.frequencyUpdate(pingFrequencySeconds)
        logOutgoing(message)
        heaterTcpSocket.write(message)
    } else {
        console.log('Heater tcp socket undefined. Not asking for status update')
    }
})

eventBus.on(UserEvents.TURN_ON, (request: TurnOnRequest) => {
    if (!heaterTcpSocket) {
        console.log('Heater not connected')
        return
    }

    const message = msgBuilder.heaterOn(
        request.targetTemperature,
        request.durationHours,
        getKnownLightState()
    )
    logOutgoing(message)
    heaterTcpSocket.write(message)
})

eventBus.on(UserEvents.TURN_OFF, (request: TurnOffRequest) => {
    if (!heaterTcpSocket) {
        console.log('Heater not connected')
        return
    }

    const message = msgBuilder.heaterOff(
        request.targetTemperature,
        getKnownLightState()
    )
    logOutgoing(message)
    heaterTcpSocket.write(message)
})

eventBus.on(UserEvents.LIGHT_SET, (request: LightToggleRequest) => {
    if (!heaterTcpSocket) {
        console.log('Heater not connected')
        return
    }

    const {heatingStartedAt, heatingEndsAt} = getKnownHeatingWindow()

    const message = msgBuilder.lightControl(
        request.lightOn,
        getKnownTargetTemperature(),
        getKnownAccessoryConfig(),
        heatingStartedAt,
        heatingEndsAt
    )
    console.log('[📤 Sending 0x07 light control packet]')
    logOutgoing(message)
    heaterTcpSocket.write(message)
})

eventBus.on(HuumEvents.CLOUD_UPDATE, (update: CloudUpdate) => {
    logPacketDiff(previousCloudUpdateHex, update.rawHex)
    previousCloudUpdateHex = update.rawHex
    controllerState.cloudUpdate = update
    controllerState.sessionState = update
    controllerState.heaterStatus = deriveSessionHeaterStatus(update)
    console.log(`Cloud update: ${JSON.stringify(update)}`)
})

eventBus.on(HuumEvents.LOCAL_HEATER_CONTROL, (update: ControlUpdate) => {
    controllerState.controlUpdate = update
    controllerState.sessionState = update
    controllerState.heaterStatus = deriveSessionHeaterStatus(update)

    controllerState.cloudUpdate = {
        ...(controllerState.cloudUpdate ?? {}),
        ...update,
    } as CloudUpdate

    console.log(`Control update: ${JSON.stringify(update)}`)
})


console.log(`🚀 TCP server listening on ${TCP_HOSTNAME}:${TCP_PORT}`)
