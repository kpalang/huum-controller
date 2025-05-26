export enum HuumEvents {
    CONFIGURATION = 'huum-config',
    LOCAL_HEATER_CONTROL = 'huum-local-heat',
    CLOUD_UPDATE = 'huum-cloud-update',
    SENSOR_READING = 'huum-sensor-read',
    HANDSHAKE = 'huum-handshake',
}

export enum UserEvents {
    TURN_ON = 'user-turn-on',
    TURN_OFF = 'user-turn-off',
}