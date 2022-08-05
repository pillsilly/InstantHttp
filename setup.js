
// polyfill Decoder
import { TextDecoder, TextEncoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// polyfill streams
import { ReadableStream, TransformStream, WritableStream } from "web-streams-polyfill/ponyfill/es2018";
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;
global.ReadableStream = ReadableStream;