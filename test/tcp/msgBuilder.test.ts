import {expect, test} from "bun:test"
import {dateToHexLE, heaterOff, heaterOn, lightControl} from "../../src/tcp/msgBuilder.ts"

test("Test timestamp generation", () => {
    const date = new Date("2025-05-20T10:45:30")
    const expectedBytes = [0x4A, 0x5D, 0x2C, 0x68] // 1747737930

    const bytes = dateToHexLE(date)
    expect(bytes).toEqual(Uint8Array.from(expectedBytes))
})

test("heaterOn preserves target, timing, and light state but clears accessory config", () => {
    const before = Math.floor(Date.now() / 1000)
    const bytes = heaterOn(50, 2, true, 0x02)
    const after = Math.floor(Date.now() / 1000)
    const readTimestamp = (offset: number) => Buffer.from(bytes).readUInt32LE(offset)

    expect(bytes[0]).toBe(0x07)
    expect(bytes[1]).toBe(50)
    expect(bytes[3]).toBe(0x01)
    expect(bytes[5]).toBe(0x00)
    expect(bytes[6]).toBe(0x03)
    expect(readTimestamp(7)).toBeGreaterThanOrEqual(before)
    expect(readTimestamp(7)).toBeLessThanOrEqual(after)
    expect(readTimestamp(11) - readTimestamp(7)).toBe(2 * 60 * 60)
    expect(readTimestamp(15)).toBeGreaterThanOrEqual(before)
    expect(readTimestamp(15)).toBeLessThanOrEqual(after)
})

test("heaterOn keeps light off when requested and still clears accessory config", () => {
    const bytes = heaterOn(50, 2, false, 0x02)

    expect(bytes[3]).toBe(0x00)
    expect(bytes[5]).toBe(0x00)
})

test("heaterOff preserves light state but clears accessory config", () => {
    const bytes = heaterOff(50, true, 0x02, new Date("2026-04-06T19:52:09.000Z"))

    expect(bytes[0]).toBe(0x07)
    expect(bytes[1]).toBe(50)
    expect(bytes[3]).toBe(0x01)
    expect(bytes[5]).toBe(0x00)
    expect(bytes[6]).toBe(0x03)
    expect(Buffer.from(bytes).readUInt32LE(15)).toBe(1775505129)
})

test("lightControl keeps accessory config behavior for dedicated light packets", () => {
    const bytes = lightControl(
        true,
        0x41,
        0x02,
        new Date("2026-04-07T16:34:58.000Z"),
        new Date("2026-04-07T19:34:58.000Z"),
        new Date("2026-04-07T16:35:00.000Z")
    )

    expect(bytes[0]).toBe(0x07)
    expect(bytes[1]).toBe(0x41)
    expect(bytes[3]).toBe(0x01)
    expect(bytes[5]).toBe(0x02)
    expect(bytes[6]).toBe(0x03)
    expect(Buffer.from(bytes).readUInt32LE(7)).toBe(1775579698)
    expect(Buffer.from(bytes).readUInt32LE(11)).toBe(1775590498)
    expect(Buffer.from(bytes).readUInt32LE(15)).toBe(1775579700)
})
