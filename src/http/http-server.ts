import {HuumEvents, UserEvents} from '../events/eventEnum.ts'
import eventBus from '../events/eventbus.ts'
import {controllerState} from '../tcp/tcp-server.ts'
import {buildStatusResponse, validateSteamerRequest} from './http-helpers.ts'

const HTTP_PORT: string = process.env.HTTP_PORT || '8080'
const HTTP_HOSTNAME: string = process.env.HTTP_HOSTNAME || '0.0.0.0'
const DEFAULT_HEARTBEAT_FREQUENCY_SECONDS = Number(process.env.UPDATE_FREQUENCY) || 60

Bun.serve({
    port: HTTP_PORT,
    hostname: HTTP_HOSTNAME,
    routes: {
        '/status': {
            GET: async () => {
                return Response.json(buildStatusResponse(controllerState, DEFAULT_HEARTBEAT_FREQUENCY_SECONDS))
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

        '/steamer': {
            POST: async req => {
                const request = await req.json() as SteamerSetRequest
                const validation = validateSteamerRequest(request, controllerState.sessionState)

                if (!validation.ok) {
                    return Response.json({
                        accepted: false,
                        error: validation.message,
                    }, {
                        status: validation.status,
                    })
                }

                eventBus.emit(UserEvents.STEAMER_SET, {intensity: validation.intensity})

                return Response.json({
                    accepted: true,
                    requestedIntensity: validation.intensity,
                    note: 'Sends a confirmed 0x07 steamer-control packet using byte 2 as live steamer intensity.',
                })
            },
        },
    },
})

console.log(`🚀 HTTP server listening on ${HTTP_HOSTNAME}:${HTTP_PORT}`)
