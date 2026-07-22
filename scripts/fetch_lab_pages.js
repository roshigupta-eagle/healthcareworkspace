const http = require('http');
const urls = [
  'http://localhost:3000/dashboard/orders/labs/new?patientId=patient-001',
  'http://localhost:3000/dashboard/orders/labs/new?patientId=patient-002',
  'http://localhost:3000/dashboard/orders/labs/new?patientId=patient-003',
];

function fetchUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      const status = res.statusCode;
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ url, status, length: data.length, snippet: data.slice(0, 1200) }));
    }).on('error', (e) => resolve({ url, error: e.message }));
  });
}

(async () => {
  for (const u of urls) {
    const r = await fetchUrl(u);
    if (r.error) {
      console.log(`URL: ${r.url} -- ERROR: ${r.error}`);
    } else {
      console.log(`URL: ${r.url} -- Status: ${r.status} Length: ${r.length}`);
      console.log('---SNIPPET START---');
      console.log(r.snippet);
      console.log('---SNIPPET END---\n');
    }
  }
})();
