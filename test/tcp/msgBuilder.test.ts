import {expect, test} from "bun:test"
import {dateToHexLE} from "../../src/tcp/msgBuilder.ts"

test("Test timestamp generation", () => {
    const date = new Date("2025-05-20T10:45:30")
    const expectedBytes = [0x4A, 0x5D, 0x2C, 0x68] // 1747737930

    const bytes = dateToHexLE(date)
    expect(bytes).toEqual(Uint8Array.from(expectedBytes))
})