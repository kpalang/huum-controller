import {getEffectiveHeaterStatus} from '../tcp/parser.ts'

const MAX_STEAMER_INTENSITY = 10

type SteamerValidationResult =
    | {ok: true; intensity: number}
    | {ok: false; status: number; message: string}

export const buildStatusResponse = (
    controllerState: Pick<ControllerState, 'sensorReading' | 'sessionState' | 'heaterStatus' | 'lastHeartbeatAt'>,
    defaultHeartbeatFrequencySeconds: number
) => ({
    temperature: controllerState.sensorReading?.temperature ?? 0,
    frequencySeconds: controllerState.sensorReading?.frequencySeconds ?? 0,
    doorOpen: controllerState.sensorReading?.doorOpen ?? null,
    doorRaw: controllerState.sensorReading?.rawDoorFlag ?? null,
    doorRawHex: controllerState.sensorReading?.rawDoorFlagHex ?? null,
    heaterStatus: getEffectiveHeaterStatus(controllerState, defaultHeartbeatFrequencySeconds),
    targetTemperature: controllerState.sessionState?.targetTemperature ?? null,
    steamerIntensity: controllerState.sessionState?.steamerIntensity ?? 0,
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

export const validateSteamerRequest = (
    request: SteamerSetRequest,
    sessionState: Pick<SessionState, 'steamerConfigured'> | undefined
): SteamerValidationResult => {
    if (!sessionState?.steamerConfigured) {
        return {
            ok: false,
            status: 409,
            message: 'Steamer accessory is not configured on the controller.',
        }
    }

    if (!Number.isInteger(request.intensity)) {
        return {
            ok: false,
            status: 400,
            message: 'Steamer intensity must be an integer between 0 and 10.',
        }
    }

    if (request.intensity < 0 || request.intensity > MAX_STEAMER_INTENSITY) {
        return {
            ok: false,
            status: 400,
            message: 'Steamer intensity must be between 0 and 10.',
        }
    }

    return {
        ok: true,
        intensity: request.intensity,
    }
}

export {MAX_STEAMER_INTENSITY}
