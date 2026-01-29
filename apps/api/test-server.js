// Simple test server to verify Node/Express works
const express = require('express');
const app = express();
const PORT = 3001;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server works!' });
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`Test: http://localhost:${PORT}/health`);
});
