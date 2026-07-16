const privateApp = require('./private-app-with-lead-screenshot.js');
const officeTurnoverAddon = require('./office-turnover-addon.js');
const ownerReportDateRangeAddon = require('./owner-report-date-range-addon.js');

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
      if (typeof html === 'string' && !html.includes('data-maintenanceai-office-turnovers')) {
        html = appendBeforeBody(html, officeTurnoverAddon);
      }
      // Keep the owner report log scoped to the selected report dates.
      if (typeof html === 'string' && !html.includes('data-maintenanceai-owner-report-date-range')) {
        html = appendBeforeBody(html, ownerReportDateRangeAddon);
      }
      res.status(statusCode).send(html);
    }
  };

  return privateApp(req, capture);
};
