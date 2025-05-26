export enum SaunaStatus {
    Offline = 0x23,
    OnlineHeating = 0x24,
    OnlineNotHeating = 0x25
}

export enum MessageType {
    CONFIGURATION = 0x02,
    LOCAL_HEATER_CONTROL = 0x07,
    CLOUD_UPDATE = 0x08,
    SENSOR_READING = 0x09,
    HANDSHAKE = 0x0b,
}