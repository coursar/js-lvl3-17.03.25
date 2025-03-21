// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var event_pb = require('./event_pb.js');

function serialize_EventRequest(arg) {
  if (!(arg instanceof event_pb.EventRequest)) {
    throw new Error('Expected argument of type EventRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_EventRequest(buffer_arg) {
  return event_pb.EventRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_EventResponse(arg) {
  if (!(arg instanceof event_pb.EventResponse)) {
    throw new Error('Expected argument of type EventResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_EventResponse(buffer_arg) {
  return event_pb.EventResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


// package lectiongrpc.event.v1;
// option go_package = "lectiongrpc/pkg/event/v1";
//
var EventServiceService = exports.EventServiceService = {
  unary: {
    path: '/EventService/Unary',
    requestStream: false,
    responseStream: false,
    requestType: event_pb.EventRequest,
    responseType: event_pb.EventResponse,
    requestSerialize: serialize_EventRequest,
    requestDeserialize: deserialize_EventRequest,
    responseSerialize: serialize_EventResponse,
    responseDeserialize: deserialize_EventResponse,
  },
  serverStream: {
    path: '/EventService/ServerStream',
    requestStream: false,
    responseStream: true,
    requestType: event_pb.EventRequest,
    responseType: event_pb.EventResponse,
    requestSerialize: serialize_EventRequest,
    requestDeserialize: deserialize_EventRequest,
    responseSerialize: serialize_EventResponse,
    responseDeserialize: deserialize_EventResponse,
  },
  clientStream: {
    path: '/EventService/ClientStream',
    requestStream: true,
    responseStream: false,
    requestType: event_pb.EventRequest,
    responseType: event_pb.EventResponse,
    requestSerialize: serialize_EventRequest,
    requestDeserialize: deserialize_EventRequest,
    responseSerialize: serialize_EventResponse,
    responseDeserialize: deserialize_EventResponse,
  },
  bidirectionalStream: {
    path: '/EventService/BidirectionalStream',
    requestStream: true,
    responseStream: true,
    requestType: event_pb.EventRequest,
    responseType: event_pb.EventResponse,
    requestSerialize: serialize_EventRequest,
    requestDeserialize: deserialize_EventRequest,
    responseSerialize: serialize_EventResponse,
    responseDeserialize: deserialize_EventResponse,
  },
};

exports.EventServiceClient = grpc.makeGenericClientConstructor(EventServiceService, 'EventService');
