// Sends "reload" to Expo Go via Metro's message socket (:8081). Silent if the server isn't running.
const WebSocket = require('ws');
const w = new WebSocket('ws://localhost:8081/message');
w.on('open', () => {
  w.send(JSON.stringify({ version: 2, method: 'reload' }));
  setTimeout(() => process.exit(0), 300);
});
w.on('error', () => process.exit(0));
