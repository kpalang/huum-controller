import {expect, test} from "bun:test"

import {parseSensorReading} from "../../src/tcp/parser.ts"

test("parseSensorReading keeps raw status metadata when present", () => {
    const reading = parseSensorReading(Uint8Array.from([0x09, 29, 0x00, 60, 0x25, 0x00]))

    expect(reading).toEqual({
        temperature: 29,
        frequencySeconds: 60,
        rawDoorFlag: 0x00,
        rawDoorFlagHex: '0x00',
        doorOpen: false,
        rawStatus: 0x25,
        rawStatusHex: '0x25',
        rawStatusLabel: 'OnlineNotHeating',
    })
})

test("parseSensorReading marks door closed when byte 2 is 0x00", () => {
    const reading = parseSensorReading(Uint8Array.from([0x09, 0x19, 0x00, 0x3C, 0x25, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))

    expect(reading).toEqual({
        temperature: 25,
        frequencySeconds: 60,
        rawDoorFlag: 0x00,
        rawDoorFlagHex: '0x00',
        doorOpen: false,
        rawStatus: 0x25,
        rawStatusHex: '0x25',
        rawStatusLabel: 'OnlineNotHeating',
    })
})

test("parseSensorReading marks door open when byte 2 is 0x01", () => {
    const reading = parseSensorReading(Uint8Array.from([0x09, 0x19, 0x01, 0x3C, 0x25, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))

    expect(reading).toEqual({
        temperature: 25,
        frequencySeconds: 60,
        rawDoorFlag: 0x01,
        rawDoorFlagHex: '0x01',
        doorOpen: true,
        rawStatus: 0x25,
        rawStatusHex: '0x25',
        rawStatusLabel: 'OnlineNotHeating',
    })
})

test("parseSensorReading preserves raw status 0x21", () => {
    const reading = parseSensorReading(Uint8Array.from([0x09, 13, 0x00, 60, 0x21, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00]))

    expect(reading).toEqual({
        temperature: 13,
        frequencySeconds: 60,
        rawDoorFlag: 0x00,
        rawDoorFlagHex: '0x00',
        doorOpen: false,
        rawStatus: 0x21,
        rawStatusHex: '0x21',
        rawStatusLabel: 'Status21',
    })
})

test("parseSensorReading preserves raw status 0x22", () => {
    const reading = parseSensorReading(Uint8Array.from([0x09, 13, 0x00, 60, 0x22, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00]))

    expect(reading).toEqual({
        temperature: 13,
        frequencySeconds: 60,
        rawDoorFlag: 0x00,
        rawDoorFlagHex: '0x00',
        doorOpen: false,
        rawStatus: 0x22,
        rawStatusHex: '0x22',
        rawStatusLabel: 'Status22',
    })
})

test("parseSensorReading labels 0x23 as online not heating", () => {
    const reading = parseSensorReading(Uint8Array.from([0x09, 13, 0x00, 60, 0x23, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00]))

    expect(reading).toEqual({
        temperature: 13,
        frequencySeconds: 60,
        rawDoorFlag: 0x00,
        rawDoorFlagHex: '0x00',
        doorOpen: false,
        rawStatus: 0x23,
        rawStatusHex: '0x23',
        rawStatusLabel: 'OnlineNotHeating',
    })
})

test("parseSensorReading labels 0x24 as online heating", () => {
    const reading = parseSensorReading(Uint8Array.from([0x09, 13, 0x00, 60, 0x24, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00]))

    expect(reading).toEqual({
        temperature: 13,
        frequencySeconds: 60,
        rawDoorFlag: 0x00,
        rawDoorFlagHex: '0x00',
        doorOpen: false,
        rawStatus: 0x24,
        rawStatusHex: '0x24',
        rawStatusLabel: 'OnlineHeating',
    })
})

test("parseSensorReading preserves raw status 0x26", () => {
    const reading = parseSensorReading(Uint8Array.from([0x09, 13, 0x00, 60, 0x26, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00]))

    expect(reading).toEqual({
        temperature: 13,
        frequencySeconds: 60,
        rawDoorFlag: 0x00,
        rawDoorFlagHex: '0x00',
        doorOpen: false,
        rawStatus: 0x26,
        rawStatusHex: '0x26',
        rawStatusLabel: 'Status26',
    })
})

test("partial sensor frames do not overwrite a known status", () => {
    const previousReading = {
        temperature: 29,
        frequencySeconds: 60,
        rawDoorFlag: 0x01,
        rawDoorFlagHex: '0x01',
        doorOpen: true,
        rawStatus: 0x25,
        rawStatusHex: '0x25',
        rawStatusLabel: 'OnlineNotHeating',
    }

    const mergedReading = {
        ...previousReading,
        ...parseSensorReading(Uint8Array.from([0x09, 11, 0x00, 60])),
    }

    expect(mergedReading).toEqual({
        temperature: 11,
        frequencySeconds: 60,
        rawDoorFlag: 0x01,
        rawDoorFlagHex: '0x01',
        doorOpen: true,
        rawStatus: 0x25,
        rawStatusHex: '0x25',
        rawStatusLabel: 'OnlineNotHeating',
    })
})
