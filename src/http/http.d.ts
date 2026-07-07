type TurnOnRequest = {
    targetTemperature: number;
    durationHours: number;
}

type TurnOffRequest = {
    targetTemperature: number;
}

type LightToggleRequest = {
    lightOn: boolean;
}
