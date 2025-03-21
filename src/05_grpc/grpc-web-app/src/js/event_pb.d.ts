import * as jspb from 'google-protobuf'



export class EventRequest extends jspb.Message {
  getId(): number;
  setId(value: number): EventRequest;

  getData(): string;
  setData(value: string): EventRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EventRequest.AsObject;
  static toObject(includeInstance: boolean, msg: EventRequest): EventRequest.AsObject;
  static serializeBinaryToWriter(message: EventRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EventRequest;
  static deserializeBinaryFromReader(message: EventRequest, reader: jspb.BinaryReader): EventRequest;
}

export namespace EventRequest {
  export type AsObject = {
    id: number,
    data: string,
  }
}

export class EventResponse extends jspb.Message {
  getId(): number;
  setId(value: number): EventResponse;

  getData(): string;
  setData(value: string): EventResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EventResponse.AsObject;
  static toObject(includeInstance: boolean, msg: EventResponse): EventResponse.AsObject;
  static serializeBinaryToWriter(message: EventResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EventResponse;
  static deserializeBinaryFromReader(message: EventResponse, reader: jspb.BinaryReader): EventResponse;
}

export namespace EventResponse {
  export type AsObject = {
    id: number,
    data: string,
  }
}

