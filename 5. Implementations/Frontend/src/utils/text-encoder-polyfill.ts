if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('text-encoding').TextEncoder;
}

if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('text-encoding').TextDecoder;
} 