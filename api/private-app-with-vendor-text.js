const privateApp = require('./private-app-with-turnovers.js');
const vendorTextDispatchAddon = require('./vendor-text-dispatch-addon.js');

function appendBeforeBody(html, patch) {
  const closingBodyIndex = html.toLowerCase().lastIndexOf('</body>');
  if (closingBodyIndex === -1) return html + patch;
  return html.slice(0, closingBodyIndex) + patch + html.slice(closingBodyIndex);
}

module.exports = async function handler(req, res) {
  let statusCode = 200;
  const capture = {
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    status(code) {
      statusCode = code;
      return capture;
    },
    send(body) {
      let html = body;
      if (typeof html === 'string' && !html.includes('data-maintenanceai-vendor-text-dispatch')) {
        html = appendBeforeBody(html, vendorTextDispatchAddon);
      }
      res.status(statusCode).send(html);
    }
  };

  return privateApp(req, capture);
};
