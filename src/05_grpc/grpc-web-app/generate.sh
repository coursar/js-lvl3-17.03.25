#!/bin/bash

export PATH=$PATH:./protoc/bin

protoc -I=. event.proto \
  --js_out=import_style=commonjs:. \
  --grpc-web_out=import_style=commonjs+dts,mode=grpcwebtext:.