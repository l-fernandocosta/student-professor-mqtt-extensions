declare module "mqtt/dist/mqtt" {
  import type { MqttClient } from "mqtt";

  export function connect(url: string, options?: { reconnectPeriod?: number }): MqttClient;

  const defaultExport: {
    connect: typeof connect;
  };

  export default defaultExport;
}
