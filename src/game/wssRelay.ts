const RELAY_BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081',
] as const;

const KEEP_ALIVE_SEC = 25;
const CONNECT_BROKER_TIMEOUT_MS = 4000;

export type RelayControlMessage =
  | { __sbRelay: 'hello'; nonce: string }
  | { __sbRelay: 'ack'; nonce: string };

export function encodeVarInt(value: number): number[] {
  const bytes: number[] = [];
  let v = Math.max(0, Math.floor(value));
  do {
    let encoded = v % 128;
    v = Math.floor(v / 128);
    if (v > 0) encoded |= 128;
    bytes.push(encoded);
  } while (v > 0);
  return bytes;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function encodeMqttString(str: string): number[] {
  const utf8 = textEncoder.encode(str);
  return [(utf8.length >> 8) & 0xff, utf8.length & 0xff, ...utf8];
}

export function encodeMqttConnect(
  clientId: string,
  keepAliveSec = KEEP_ALIVE_SEC
): Uint8Array<ArrayBuffer> {
  const varHeader = [
    0x00,
    0x04,
    0x4d,
    0x51,
    0x54,
    0x54, // "MQTT"
    0x04, // Protocol level 4 (MQTT 3.1.1)
    0x02, // Clean session
    (keepAliveSec >> 8) & 0xff,
    keepAliveSec & 0xff,
  ];
  const payload = encodeMqttString(clientId);
  const remLen = encodeVarInt(varHeader.length + payload.length);
  return new Uint8Array([0x10, ...remLen, ...varHeader, ...payload]);
}

export function encodeMqttSubscribe(
  packetId: number,
  topic: string
): Uint8Array<ArrayBuffer> {
  const varHeader = [(packetId >> 8) & 0xff, packetId & 0xff];
  const payload = [...encodeMqttString(topic), 0x00]; // QoS 0
  const remLen = encodeVarInt(varHeader.length + payload.length);
  return new Uint8Array([0x82, ...remLen, ...varHeader, ...payload]);
}

export function encodeMqttPublish(
  topic: string,
  message: string
): Uint8Array<ArrayBuffer> {
  const topicBytes = encodeMqttString(topic);
  const msgBytes = textEncoder.encode(message);
  const remLen = encodeVarInt(topicBytes.length + msgBytes.length);
  return new Uint8Array([0x30, ...remLen, ...topicBytes, ...msgBytes]);
}

export function encodeMqttPingreq(): Uint8Array<ArrayBuffer> {
  return new Uint8Array([0xc0, 0x00]);
}

export function encodeMqttDisconnect(): Uint8Array<ArrayBuffer> {
  return new Uint8Array([0xe0, 0x00]);
}

export interface DecodedMqttPacket {
  type: number; // high nibble shifted right by 4 (2=CONNACK, 3=PUBLISH, 9=SUBACK, 13=PINGRESP)
  topic?: string;
  payload?: string;
}

/**
 * Decodes zero or more complete MQTT packets from an incoming byte stream buffer
 * and returns any leftover partial trailing bytes to prepend to the next frame.
 */
export function decodeMqttPackets(buffer: Uint8Array): {
  packets: DecodedMqttPacket[];
  remainder: Uint8Array;
} {
  const packets: DecodedMqttPacket[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 2 > buffer.length) break;

    const header = buffer[offset];
    const packetType = (header >> 4) & 0x0f;
    const qos = (header >> 1) & 0x03;

    let multiplier = 1;
    let remLength = 0;
    let lenBytes = 0;
    let incompleteVarInt = false;

    while (true) {
      const idx = offset + 1 + lenBytes;
      if (idx >= buffer.length) {
        incompleteVarInt = true;
        break;
      }
      const encodedByte = buffer[idx];
      remLength += (encodedByte & 0x7f) * multiplier;
      lenBytes += 1;
      if ((encodedByte & 0x80) === 0) break;
      multiplier *= 128;
      if (lenBytes >= 4) break;
    }

    if (incompleteVarInt) break;

    const totalLen = 1 + lenBytes + remLength;
    if (offset + totalLen > buffer.length) break;

    const bodyStart = offset + 1 + lenBytes;
    const bodyEnd = bodyStart + remLength;

    if (packetType === 3 && remLength >= 2) {
      // PUBLISH
      const topicLen = (buffer[bodyStart] << 8) | buffer[bodyStart + 1];
      const topicStart = bodyStart + 2;
      const topicEnd = Math.min(bodyEnd, topicStart + topicLen);
      const topic = textDecoder.decode(buffer.subarray(topicStart, topicEnd));
      const payloadStart = Math.min(bodyEnd, topicEnd + (qos > 0 ? 2 : 0));
      const payload = textDecoder.decode(buffer.subarray(payloadStart, bodyEnd));
      packets.push({ type: packetType, topic, payload });
    } else {
      packets.push({ type: packetType });
    }

    offset += totalLen;
  }

  return {
    packets,
    remainder: offset < buffer.length ? buffer.slice(offset) : new Uint8Array(0),
  };
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

export interface WssRelayEvents {
  onReady: () => void;
  onMessage: (rawJson: string) => void;
  onError: (detail: string) => void;
}

export class WssRelayClient {
  private ws: WebSocket | null = null;
  private rxBuf: Uint8Array = new Uint8Array(0);
  private ready = false;
  private closed = false;
  private brokerIndex = 0;
  private keepAliveTimer: number | null = null;
  private connectTimer: number | null = null;
  private readonly clientId: string;
  private readonly subTopic: string;
  private readonly pubTopic: string;
  private readonly events: WssRelayEvents;

  constructor(subTopic: string, pubTopic: string, clientPrefix: string, events: WssRelayEvents) {
    this.subTopic = subTopic;
    this.pubTopic = pubTopic;
    this.clientId = `${clientPrefix}_${Math.random().toString(36).slice(2, 10)}`;
    this.events = events;
    this.connectBroker(0);
  }

  public isReady(): boolean {
    return this.ready && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public publishJson(payload: unknown): boolean {
    if (!this.isReady() || !this.ws) return false;
    try {
      this.ws.send(encodeMqttPublish(this.pubTopic, JSON.stringify(payload)));
      return true;
    } catch {
      return false;
    }
  }

  private connectBroker(idx: number): void {
    if (this.closed) return;
    if (idx >= RELAY_BROKERS.length) {
      this.events.onError('Could not reach any online relay server.');
      return;
    }

    this.brokerIndex = idx;
    this.ready = false;
    this.rxBuf = new Uint8Array(0);
    this.clearTimers();

    const url = RELAY_BROKERS[idx];
    let ws: WebSocket;
    try {
      ws = new WebSocket(url, 'mqtt');
    } catch {
      this.connectBroker(idx + 1);
      return;
    }

    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    this.connectTimer = window.setTimeout(() => {
      if (this.closed || this.ws !== ws || this.ready) return;
      try {
        ws.close();
      } catch {
        // Ignore
      }
      this.connectBroker(idx + 1);
    }, CONNECT_BROKER_TIMEOUT_MS);

    ws.onopen = () => {
      if (this.closed || this.ws !== ws) return;
      try {
        ws.send(encodeMqttConnect(this.clientId, KEEP_ALIVE_SEC));
      } catch {
        this.failCurrentBroker();
      }
    };

    ws.onmessage = (ev) => {
      if (this.closed || this.ws !== ws) return;
      if (!(ev.data instanceof ArrayBuffer)) return;

      const chunk = new Uint8Array(ev.data);
      this.rxBuf = concatBytes(this.rxBuf, chunk);
      const { packets, remainder } = decodeMqttPackets(this.rxBuf);
      this.rxBuf = remainder;

      for (const pkt of packets) {
        if (pkt.type === 2) {
          // CONNACK -> subscribe to incoming topic
          try {
            ws.send(encodeMqttSubscribe(1, this.subTopic));
          } catch {
            this.failCurrentBroker();
            return;
          }
        } else if (pkt.type === 9) {
          // SUBACK -> channel is fully live
          if (!this.ready) {
            this.ready = true;
            if (this.connectTimer !== null) {
              window.clearTimeout(this.connectTimer);
              this.connectTimer = null;
            }
            this.startKeepAlive(ws);
            this.events.onReady();
          }
        } else if (pkt.type === 3 && pkt.payload !== undefined) {
          this.events.onMessage(pkt.payload);
        }
      }
    };

    ws.onerror = () => {
      if (this.closed || this.ws !== ws) return;
      if (!this.ready) {
        this.failCurrentBroker();
      }
    };

    ws.onclose = () => {
      if (this.closed || this.ws !== ws) return;
      this.stopKeepAlive();
      if (!this.ready) {
        this.failCurrentBroker();
      } else {
        // Reconnect seamlessly if connection drops mid-session
        this.ready = false;
        window.setTimeout(() => {
          if (!this.closed) {
            this.connectBroker(this.brokerIndex);
          }
        }, 600);
      }
    };
  }

  private failCurrentBroker(): void {
    const nextIdx = this.brokerIndex + 1;
    if (this.ws) {
      const old = this.ws;
      this.ws = null;
      try {
        old.close();
      } catch {
        // Ignore
      }
    }
    this.clearTimers();
    this.connectBroker(nextIdx);
  }

  private startKeepAlive(ws: WebSocket): void {
    this.stopKeepAlive();
    this.keepAliveTimer = window.setInterval(() => {
      if (!this.closed && this.ws === ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(encodeMqttPingreq());
        } catch {
          // Ignore
        }
      }
    }, (KEEP_ALIVE_SEC - 6) * 1000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer !== null) {
      window.clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private clearTimers(): void {
    this.stopKeepAlive();
    if (this.connectTimer !== null) {
      window.clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }

  public close(): void {
    this.closed = true;
    this.ready = false;
    this.clearTimers();
    if (this.ws) {
      const sock = this.ws;
      this.ws = null;
      try {
        if (sock.readyState === WebSocket.OPEN) {
          sock.send(encodeMqttDisconnect());
        }
        sock.close();
      } catch {
        // Ignore
      }
    }
  }
}
