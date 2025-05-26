import {MessageType, SaunaStatus} from './enums.ts'
import {parseControllerHandshake} from '../util.ts'
import * as msgBuilder from './msgBuilder.ts'

import {HuumEvents, UserEvents} from '../events/eventEnum.ts'
import eventBus from '../events/eventbus.ts'

let heaterTcpSocket: Bun.TCPSocket | undefined

const TCP_PORT = 6969 // Must not be changed
const TCP_HOSTNAME = process.env.TCP_HOSTNAME || '0.0.0.0'

const pingFrequencySeconds = Number(process.env.UPDATE_FREQUENCY) || 60

Bun.listen({
    port: TCP_PORT,
    hostname: TCP_HOSTNAME,
    socket: {
        open(socket) {
            console.log('[+] New TCP client connected')
            heaterTcpSocket = socket
        },

        data(socket, buffer) {
            const messageType = buffer[0]

            switch (messageType) {
                case MessageType.HANDSHAKE:
                    eventBus.emit(HuumEvents.HANDSHAKE, buffer)
                    break
                case MessageType.SENSOR_READING:
                    eventBus.emit(
                        HuumEvents.SENSOR_READING,
                        {
                            temperature: Number(buffer[1]),
                            status: SaunaStatus[buffer[4]!!],
                            frequencySeconds: Number(buffer[3]),
                        } as SensorUpdate
                    )
                    break
                case MessageType.CLOUD_UPDATE:
                    eventBus.emit(HuumEvents.CLOUD_UPDATE, buffer)
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
    console.log(`Sensor reading: ${JSON.stringify(update)}`)
})

eventBus.on(HuumEvents.HANDSHAKE, (buffer: Buffer) => {
    const handshake = parseControllerHandshake(buffer)
    console.log(`Handshake: ${JSON.stringify(handshake)}`)

    eventBus.emit(HuumEvents.CONFIGURATION)
})

eventBus.on(HuumEvents.CONFIGURATION, () => {
    // Ask the controller for a status update
    if (heaterTcpSocket) {
        const message = msgBuilder.frequencyUpdate(pingFrequencySeconds)
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

    const message = msgBuilder.heaterOn(request.targetTemperature, request.durationHours)
    heaterTcpSocket.write(message)
})

eventBus.on(UserEvents.TURN_OFF, (request: TurnOffRequest) => {
    if (!heaterTcpSocket) {
        console.log('Heater not connected')
        return
    }

    const message = msgBuilder.heaterOff(request.targetTemperature)
    heaterTcpSocket.write(message)
})

eventBus.on(HuumEvents.CLOUD_UPDATE, (data: Buffer) => {
    console.log('[📥 Received data]', data.toString('hex'))
})


console.log(`🚀 TCP server listening on ${TCP_HOSTNAME}:${TCP_PORT}`)
