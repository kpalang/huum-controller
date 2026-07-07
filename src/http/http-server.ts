import {HuumEvents, UserEvents} from '../events/eventEnum.ts'
import eventBus from '../events/eventbus.ts'
import {controllerState} from '../tcp/tcp-server.ts'
import {getEffectiveHeaterStatus} from '../tcp/parser.ts'

const HTTP_PORT: string = process.env.HTTP_PORT || '8080'
const HTTP_HOSTNAME: string = process.env.HTTP_HOSTNAME || '0.0.0.0'
const DEFAULT_HEARTBEAT_FREQUENCY_SECONDS = Number(process.env.UPDATE_FREQUENCY) || 60

Bun.serve({
    port: HTTP_PORT,
    hostname: HTTP_HOSTNAME,
    routes: {
        '/status': {
            GET: async () => {
                return Response.json({
                    temperature: controllerState.sensorReading?.temperature ?? 0,
                    frequencySeconds: controllerState.sensorReading?.frequencySeconds ?? 0,
                    doorOpen: controllerState.sensorReading?.doorOpen ?? null,
                    doorRaw: controllerState.sensorReading?.rawDoorFlag ?? null,
                    doorRawHex: controllerState.sensorReading?.rawDoorFlagHex ?? null,
                    heaterStatus: getEffectiveHeaterStatus(controllerState, DEFAULT_HEARTBEAT_FREQUENCY_SECONDS),
                    targetTemperature: controllerState.sessionState?.targetTemperature ?? null,
                    lightOn: controllerState.sessionState?.lightOn ?? false,
                    lightConfigured: controllerState.sessionState?.lightConfigured ?? false,
                    steamerConfigured: controllerState.sessionState?.steamerConfigured ?? false,
                    sensorStatusRaw: controllerState.sensorReading?.rawStatus ?? null,
                    sensorStatusHex: controllerState.sensorReading?.rawStatusHex ?? null,
                    sensorStatusLabel: controllerState.sensorReading?.rawStatusLabel ?? null,
                    sensorStatusTrusted: false,
                    heatingStartedAt: controllerState.sessionState?.heatingStartedAt ?? null,
                    heatingEndsAt: controllerState.sessionState?.heatingEndsAt ?? null,
                    reportedAt: controllerState.sessionState?.reportedAt ?? null,
                })
            },
        },

        '/debug/state': {
            GET: async () => {
                return Response.json(controllerState)
            },
        },

        '/start': {
            POST: async req => {
                const request = await req.json() as TurnOnRequest
                eventBus.emit(UserEvents.TURN_ON, request)
                return new Response('I guess')
            },
        },

        '/stop': {
            POST: async req => {
                const request = await req.json() as TurnOffRequest
                eventBus.emit(UserEvents.TURN_OFF, request)
                return new Response('shush')
            },
        },

        '/light': {
            POST: async req => {
                const request = await req.json() as LightToggleRequest
                eventBus.emit(UserEvents.LIGHT_SET, request)

                return Response.json({
                    accepted: true,
                    requestedLightOn: request.lightOn,
                    note: 'Sends a confirmed 0x07 light-control packet using byte 3 as live light state and byte 5 as accessory configuration.',
                })
            },
        },
    },
})

console.log(`🚀 HTTP server listening on ${HTTP_HOSTNAME}:${HTTP_PORT}`)
