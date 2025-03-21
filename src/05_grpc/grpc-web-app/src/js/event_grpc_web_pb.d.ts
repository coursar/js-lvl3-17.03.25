import * as grpcWeb from 'grpc-web';

import * as event_pb from './event_pb'; // proto import: "event.proto"


export class EventServiceClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: any; });

  unary(
    request: event_pb.EventRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.RpcError,
               response: event_pb.EventResponse) => void
  ): grpcWeb.ClientReadableStream<event_pb.EventResponse>;

  serverStream(
    request: event_pb.EventRequest,
    metadata?: grpcWeb.Metadata
  ): grpcWeb.ClientReadableStream<event_pb.EventResponse>;

}

export class EventServicePromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: any; });

  unary(
    request: event_pb.EventRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<event_pb.EventResponse>;

  serverStream(
    request: event_pb.EventRequest,
    metadata?: grpcWeb.Metadata
  ): grpcWeb.ClientReadableStream<event_pb.EventResponse>;

}

