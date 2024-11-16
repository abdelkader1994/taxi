const express = require('express');

const ngrok = require('@ngrok/ngrok');

const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
const port = process.env.PORT || 3001
app.use(bodyParser.json())

app.use(express.static('audio'));


// Start server
app.listen(port, () => {
  console.log(`IVR system running at http://localhost:${port}`);
});

// // Get your endpoint online
// ngrok.connect({ addr: port, authtoken_from_env: true })
// 	.then(listener => console.log(`Ingress established at: ${listener.url()}`));