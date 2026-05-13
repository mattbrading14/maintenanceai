module.exports = function handler(req, res) {
  res.writeHead(302, {
    Location: 'https://mattbrading14.github.io/maintenanceai_public/',
    'Cache-Control': 'no-store'
  });
  res.end();
};
