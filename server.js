const AnyProxy = require('anyproxy');
const options = {
  port: 8001,
  rule: require('./rule.js'),
  webInterface: {
    enable: true,
    webPort: 8002
  },
  wsIntercept: true,
  silent: false
};
const proxyServer = new AnyProxy.ProxyServer(options);

proxyServer.on('ready', () => { /* */ });
proxyServer.on('error', (e) => { /* */ });
proxyServer.start();
