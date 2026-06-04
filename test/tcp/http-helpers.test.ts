import {expect, test} from "bun:test"

import {buildStatusResponse, validateSteamerRequest} from "../../src/http/http-helpers.ts"

test("buildStatusResponse includes steamer intensity from session state", () => {
    const status = buildStatusResponse({
        sensorReading: {
            temperature: 25,
            frequencySeconds: 60,
            doorOpen: false,
            rawDoorFlag: 0x00,
            rawDoorFlagHex: '0x00',
            rawStatus: 0x24,
            rawStatusHex: '0x24',
            rawStatusLabel: 'OnlineHeating',
        },
        sessionState: {
            messageType: 0x08,
            targetTemperature: 65,
            steamerIntensity: 7,
            lightOn: true,
            lightConfigured: true,
            steamerConfigured: true,
            flags: {
                reserved: [7, 0],
                lightState: 1,
                accessoryConfig: 0x03,
                mode: 0x03,
                tail: [0, 0, 0, 0],
                trailer: [1, 0],
            },
            heatingStartedAt: null,
            heatingEndsAt: null,
            reportedAt: new Date('2026-05-01T14:54:57.000Z'),
            rawHex: '08410a000003030000000000000000c1bef469000000000100',
        },
        heaterStatus: 'OnlineNotHeating',
        lastHeartbeatAt: new Date('2026-05-01T14:54:58.000Z'),
    }, 60)

    expect(status.steamerIntensity).toBe(7)
    expect(status.steamerConfigured).toBe(true)
    expect(status.lightOn).toBe(true)
})

test("validateSteamerRequest accepts integer values between 0 and 10 when configured", () => {
    expect(validateSteamerRequest({intensity: 0}, {steamerConfigured: true})).toEqual({ok: true, intensity: 0})
    expect(validateSteamerRequest({intensity: 5}, {steamerConfigured: true})).toEqual({ok: true, intensity: 5})
    expect(validateSteamerRequest({intensity: 10}, {steamerConfigured: true})).toEqual({ok: true, intensity: 10})
})

test("validateSteamerRequest rejects unsupported or invalid values", () => {
    expect(validateSteamerRequest({intensity: 3}, {steamerConfigured: false})).toEqual({
        ok: false,
        status: 409,
        message: 'Steamer accessory is not configured on the controller.',
    })

    expect(validateSteamerRequest({intensity: -1}, {steamerConfigured: true})).toEqual({
        ok: false,
        status: 400,
        message: 'Steamer intensity must be between 0 and 10.',
    })

    expect(validateSteamerRequest({intensity: 11}, {steamerConfigured: true})).toEqual({
        ok: false,
        status: 400,
        message: 'Steamer intensity must be between 0 and 10.',
    })

    expect(validateSteamerRequest({intensity: 1.5}, {steamerConfigured: true})).toEqual({
        ok: false,
        status: 400,
        message: 'Steamer intensity must be an integer between 0 and 10.',
    })
})
