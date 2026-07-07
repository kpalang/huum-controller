# Local Huum sauna heater controller

This is a sample implementation of the Huum sauna controller communication protocol. It is used to control your
[Huum](https://huumsauna.com/product/uku-wifi/) sauna without relying on their proprietary cloud.

This repository is accompanied by a [blog post](https://kaurpalang.com/posts/invading-the-sauna/).

> [!CAUTION]
> This approach does not work with firmware `4.4.18.0-4`. More info in [`#4`](https://github.com/kpalang/huum-controller/issues/4).

## Requirements
- [Bun](https://bun.sh/)
  - The project is using Bun 1.12.4

## Running

### Local (requires Bun installed)
1. Install dependencies `bun install`
2. Start the server `bun run start`

### Docker (no local dependencies required)
1. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

2. Or build and run manually:
   ```bash
   docker build -t huum-controller .
   docker run -p 6969:6969 -p 8080:8080 huum-controller
   ```

3. Enable debug protocol logging with environment variable:
   ```bash
   docker run -p 6969:6969 -p 8080:8080 -e DEBUG_PROTOCOL=1 huum-controller
   ```

## Usage
The server starts a TCP server on port `6969`. The port must not be changes. What can be changes is the host. To do so,
set `TCP_HOSTNAME` to what you desire. It defaults to `0.0.0.0`.

The TCP server is used to exchange messages with the sauna heater.

Another, HTTP, server is started on `0.0.0.0:8080`. Both components can be changed with `HTTP_HOSTNAME` and `HTTP_PORT`.
The endpoints on that server are used to enable controlling the sauna heater by more conventional methods (_`curl`_...).

### Endpoints
**`GET /status`**
Responds with a JSON summary of the latest known controller state.

Example response:

```json
{
  "temperature": 27,
  "frequencySeconds": 60,
  "heaterStatus": "OnlineHeating",
  "targetTemperature": 65,
  "lightOn": true,
  "lightConfigured": true,
  "steamerConfigured": false,
  "sensorStatusRaw": 35,
  "sensorStatusHex": "0x23",
  "sensorStatusLabel": "OnlineNotHeating",
  "sensorStatusTrusted": false,
  "heatingStartedAt": "2026-04-07T19:45:52.000Z",
  "heatingEndsAt": "2026-04-07T21:45:52.000Z",
  "reportedAt": "2026-04-07T19:47:08.000Z"
}
```

- `heaterStatus`: normalized session state derived from `0x07`/`0x08` updates, with `Offline` returned after more than 3 missed `0x09` heartbeats.
- `lightOn`: whether the sauna light is currently on.
- `lightConfigured`: whether a light accessory is present/configured on the controller.
- `steamerConfigured`: whether a steamer accessory is present/configured on the controller.
- `doorOpen`: latest observed `0x09` byte `2` interpreted as a door contact bit (`0x00` closed, `0x01` open).
- `sensorStatus*`: raw `0x09` telemetry, exposed for reverse engineering only. `sensorStatusTrusted` remains `false` because the byte still flips inconsistently in captures.

---
**`GET /debug/state`**
Responds with the latest parsed controller state as JSON, including the latest handshake, sensor reading, and `0x08`
cloud update payload.

This includes latest `lightOn`, `lightConfigured`, and `steamerConfigured` accessory flags derived from the `0x08` payload.

This is useful for reverse engineering extra features such as light control: toggle the light physically or from the
official app, then compare the JSON and `rawHex` fields before and after the change.

---
**`POST /start`**
Starts the heater with a target heating temperature
You have to make sure to diable the remote start protection

```typescript
type TurnOnRequest = {
    targetTemperature: number;
    durationHours: number;
}
```

---
**`POST /stop`**
Stops the heater.

```typescript
type TurnOffRequest = {
  targetTemperature: number;
}
```

---
**`POST /light`**
Endpoint for toggling the sauna light.

```typescript
type LightToggleRequest = {
  lightOn: boolean;
}
```

This sends a confirmed `0x07` control packet using byte `3` as the live light-state field and byte `5` as the
accessory configuration bitmask observed from `0x08` status updates.

## Home Assistant package

A ready-to-use Home Assistant package is included at `homeassistant/packages/huum_sauna.yaml`.

To use it:

1. Copy `homeassistant/packages/huum_sauna.yaml` into your Home Assistant config directory under `packages/`.
2. Enable package loading in your Home Assistant `configuration.yaml`:

   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```

3. Edit the package and replace every `http://YOUR-HUUM-HOST:8080` placeholder with the reachable base URL for this
   controller.
4. Reload Home Assistant YAML configuration, or restart Home Assistant.

The package exposes:
- `switch.huum_sauna` for starting and stopping a sauna session
- `switch.huum_light` for light control when the accessory is configured
- `sensor.huum_sauna_temperature` and `sensor.huum_sauna_status` for monitoring
- `input_number.huum_sauna_target_temperature` and `input_number.huum_sauna_duration` for session settings

## Message types and payloads
### 0x02 - Set Ping frequency

Message is sent by the server to set how often the sauna controller should report its temperature sensor reading and
heater state. Can be used whenever to update the frequency.

**Sample Message:**
```
02 3f 31 2e 68 fc 00
```

| Byte | Example | Meaning |
|------|---------|---------|
| `0` | `02` | Message ID - Ping frequency update |
| `1-4` | `3f 31 2e 68` | Current timestamp (Little Endian) |
| `5` | `fc` | 0 - 255 delay in seconds |
| `6` | `00` | Termination | 


### 0x07 - Heater control

Used by both the local physical interface and the server to turn the heater on and off. It is also used for light
control.

**Sample Message:**
```  
07 38 00 00 00 00 03 47 2f 2e 68 77 59 2e 68 47 2f 2e 68 ec c5 ef 10 00
``` 

| Byte | Example | Meaning |
|------|---------|---------|  
| `0` | `07` | Message ID - Heater control |
| `1` | `38` | Current temp in Hex (`56`deg here) |
| `2` | `00` | Unknown |
| `3` | `00` | Light state (`00` off, `01` on) |
| `4` | `00` | Unknown |
| `5` | `00` | Accessory configuration bitmask (`01` steamer, `02` light, `03` both) |
| `6` | `03` | Unknown |
| `7-10` | `47 2f 2e 68` | Heating started timestamp |
| `11-14` | `77 59 2e 68` | Heating stop timestamp |
| `15-18` | `47 2f 2e 68` | Current timestamp |
| `19-22` | `ec c5 ef 10` | Unknown values |
| `23` | `00` | Termination |

The "heating started" and "heating stop" timestamps are here zeroed, meaning the heater will turn off.

**Confirmed sample messages for light control**
```
07 41 00 01 00 02 03 00 00 00 00 00 00 00 00 65 86 d2 69 00 00 00 00 00
07 41 00 00 00 02 03 00 00 00 00 00 00 00 00 a6 86 d2 69 00 00 00 00 00
```
Flipping byte 3 from 01 to 00 turns light off

| Byte | Example | Meaning |
|------|---------|---------|
| `0` | `07` | Message ID `0x07` |
| `1` | `41` | Target temperature |
| `2` | `00` | Unknown |
| `3` | `01` | Light state (`00` off, `01` on) |
| `4` | `00` | Unknown |
| `5` | `02` | Accessory configuration bitmask (`01` steamer, `02` light, `03` both) |
| `6` | `03` | Unknown |
| `7-10` | `00 00 00 00` | Heating started timestamp (zeroed for light control) |
| `11-14` | `00 00 00 00` | Heating stop timestamp (zeroed for light control) |
| `15-18` | `65 86 d2 69` | Current timestamp |
| `19-22` | `00 00 00 00` | Unknown values |
| `23` | `00` | Termination |


### 0x08 - Send update to cloud

Message is used to send heater state changes to the cloud.

**Sample Message:**
```
08 38 00 00 00 00 03 00 00 00 00 00 00 00 00 3f 31 2e 68 00 00 00 00 01 00
```

| Byte | Example | Meaning |
|------|---------|---------|  
| `0` | `08` | Message ID - Update cloud |
| `1` | `38` | Current temp in Hex (`56`deg here) |
| `2` | `00` | Unknown |
| `3` | `00` | Light state (`00` off, `01` on) |
| `4` | `00` | Unknown |
| `5` | `00` | Accessory configuration bitmask (`01` steamer, `02` light, `03` both) |
| `6` | `03` | Unknown |
| `7-10` | `00 00 00 00` | Heating started timestamp |
| `11-14` | `00 00 00 00` | Heating stop timestamp |
| `15-18` | `3f 31 2e 68` | Current timestamp |
| `19-22` | `00 00 00 00` | Unknown values |
| `23` | `01` | Trailer byte |
| `24` | `00` | Termination |

so it is easier to compare captures while toggling external features.

For convenience, the TCP server also prints a byte-by-byte diff between consecutive `0x08` frames.

### 0x09 - Status ping

Sent by the controller to report temperature sensor reading.

The temperature and frequency fields are useful. Recent captures suggest:
- `0x23` means online but not heating
- `0x24` means actively heating

But `0x09` still flips between `0x23` and `0x24` without a matching session-state change, so HTTP `/status` continues to derive
`heaterStatus` from `0x07`/`0x08` session state while exposing the raw `0x09` reading only as observational data.

**Sample Message:**
Older sample:
```
09 21 00 fc 24 00 00 00 00 00 00

09 0d 00 3c 21 02 00 00 00 00 00

09 19 00 3c 25 00 00 00 00 00 00
09 19 01 3c 25 00 00 00 00 00 00
```

| Byte | Example | Meaning |
|------|---------|---------|
| `0` | `09` | Message ID - Status update |
| `1` | `21` | Current temp in Hex (`33`deg here) |
| `2` | `00` / `01` | Observed door bit: `00` closed, `01` open |
| `3` | `fc` | Frequency in seconds |
| `4` | `24` | Heater state 21-26 |
| `5` | `02` | Unknown, seems to indicate "something" |
| `6-9` | `00 00 00 00` | Padding? |
| `10` | `00` | Termination |

### 0x0B - Server greeting

Sent by the controller when establishing connection with the cloud server. Contains firmware version, controller's
friendly name, and some other stuff I'm too lazy to figure out.

**Sample Message:**
```
0b 00 00 ac 68 b5 9c 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 55 51 34 2d 34 2d 32 2e 32 2e 31 32 31 33 2d 34 61 31 64 36 64 61 31 2d 34 00 00 00 00 00 55 51 34 20 45 55 20 57 69 46 69 00 00 00 00
```
