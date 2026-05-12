const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  const filePath = path.join(process.cwd(), 'maintenanceai-website-v2.html');
  let html = fs.readFileSync(filePath, 'utf8');

  if (!html.includes('assets/maintenanceai-mark.svg')) {
    html = html.replace(
      '<meta name="description" content="MaintenanceAI helps property managers automate work orders, bid requests, preventive maintenance, vendor coordination, and owner reporting." />',
      '<meta name="description" content="MaintenanceAI helps property managers automate work orders, bid requests, preventive maintenance, vendor coordination, and owner reporting." />\n<link rel="icon" type="image/svg+xml" href="assets/maintenanceai-mark.svg" />'
    );
  }

  html = html.replace(
    '<span class="mark">M</span>',
    '<img class="mark" src="assets/maintenanceai-mark.svg" alt="" />'
  );

  html = html.replace(
    /\.mark \{([\s\S]*?)font-weight: 800;\n\}/,
    '.mark {$1font-weight: 800;\n  object-fit: contain;\n}'
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
  res.status(200).send(html);
};
