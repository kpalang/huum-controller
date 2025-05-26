type Handshake = {
    macAddress: string;
    firmware: string;
    deviceName: string;
}

type SensorUpdate = {
    temperature: number;
    status: SaunaStatus;
    frequencySeconds: number;
}