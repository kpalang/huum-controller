type Handshake = {
    macAddress: string;
    firmware: string;
    deviceName: string;
}

type HeaterStatus = 'OnlineHeating' | 'OnlineNotHeating' | 'Unknown';

type SensorStatusLabel =
    | 'Status21'
    | 'Status22'
    | 'OnlineHeating'
    | 'OnlineNotHeating'
    | 'Status26';

type SensorUpdate = {
    temperature: number;
    frequencySeconds: number;
    rawStatus?: number;
    rawStatusHex?: string;
    rawStatusLabel?: SensorStatusLabel;
}

type CloudUpdate = {
    messageType: number;
    targetTemperature: number;
    lightOn: boolean;
    lightConfigured: boolean;
    steamerConfigured: boolean;
    flags: {
        reserved: number[];
        lightState: number;
        accessoryConfig: number;
        mode: number;
        tail: number[];
        trailer: number[];
    };
    heatingStartedAt: Date | null;
    heatingEndsAt: Date | null;
    reportedAt: Date | null;
    rawHex: string;
}

type ControlUpdate = {
    messageType: number;
    targetTemperature: number;
    lightOn: boolean;
    lightConfigured: boolean;
    steamerConfigured: boolean;
    flags: {
        reserved: number[];
        lightState: number;
        accessoryConfig: number;
        mode: number;
        tail: number[];
        trailer: number[];
    };
    heatingStartedAt: Date | null;
    heatingEndsAt: Date | null;
    reportedAt: Date | null;
    rawHex: string;
}

type SessionState = Pick<CloudUpdate, 'messageType' | 'targetTemperature' | 'lightOn' | 'lightConfigured' | 'steamerConfigured' | 'flags' | 'heatingStartedAt' | 'heatingEndsAt' | 'reportedAt' | 'rawHex'>;

type ControllerState = {
    handshake?: Handshake;
    sensorReading?: SensorUpdate;
    cloudUpdate?: CloudUpdate;
    controlUpdate?: ControlUpdate;
    sessionState?: SessionState;
    heaterStatus?: HeaterStatus;
}
