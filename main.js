const express = require('express');
const twilio = require('twilio');
const ngrok = require('@ngrok/ngrok');

const loki = require("lokijs")
const db = new loki('example.db');

const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { SpeechClient } = require('@google-cloud/speech');

const path = require("path")
const fs = require("fs")
require('dotenv').config()

// Initialize Google Cloud Speech client
const client = new SpeechClient({
  keyFilename: './service-account-key.json', // Replace with your key file path
});

const users = db.addCollection('users');


const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const port = process.env.PORT || 3000;

const url = "https://95bd-41-96-224-70.ngrok-free.app"


// Helper function to download an audio file
async function downloadAudio(url , outputPath) {
  const authString = btoa(`${process.env.A1}:${process.env.A2}`);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded'
  }
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// Helper function to convert MP3 to WAV
async function convertToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioChannels(1) // Mono audio
      .audioFrequency(16000) // 16 kHz sample rate
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

// Main function to process speech-to-text
async function transcribeFromUrl(audioUrl) {
  const tempMp3 = path.join(__dirname, 'temp.mp3');
  const tempWav = path.join(__dirname, 'temp.wav');

  try {
    // Step 1: Download MP3 file
    console.log('Downloading audio file...');
    await downloadAudio(audioUrl, tempMp3);

    // Step 2: Convert MP3 to WAV
    console.log('Converting audio to WAV format...');
    await convertToWav(tempMp3, tempWav);

    // Step 3: Read the WAV file
    const audioBytes = fs.readFileSync(tempWav).toString('base64');

    // Step 4: Configure the request
    const request = {
      audio: { content: audioBytes },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'fr-FR', // Change to your desired language
      },
    };

    // Step 5: Perform speech recognition
    console.log('Transcribing audio...');
    const [response] = await client.recognize(request);

    // Output transcription
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
      console.log(transcription)
    return transcription;
  } catch (error) {
    console.error('Error during transcription:', error);
    return "error"
  } finally {
    // Cleanup temporary files
    [tempMp3, tempWav].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  }
}


app.post('/voice', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
  
    // Start by greeting the caller
    //twiml.say("Bienvenue à notre service.", { language: 'fr' });
    twiml.play(`${url}/1.mp3` );
  
    // Present options
    const gather = twiml.gather({
      input: 'dtmf',
      numDigits: 1,
      action: '/handle-key'
    });
    //gather.say("Pour les ventes, appuyez sur 1.  Pour laisser un message, appuyez sur 2.", { language: 'fr' });
  
    gather.play(`${url}/2.mp3` );
    // If no input is received, repeat the options
    twiml.redirect('/voice');
  
    res.type('text/xml');
    res.send(twiml.toString());
});

app.post('/handle-key', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const selectedOption = req.body.Digits;
  
    switch (selectedOption) {
      case '1':
        // twiml.say("Vous avez sélectionné les ventes. Veuillez patienter pendant que nous vous mettons en relation.", { language: 'fr' });

        twiml.play(`${url}/3.mp3` );

        twiml.dial('SALES_TEAM_PHONE_NUMBER');
        break;
      
      case '2':
        // twiml.say("Veuillez laisser votre message après le bip. Appuyez sur une touche lorsque vous avez terminé.", { language: 'fr' });
        twiml.play(`${url}/4.mp3` );
        twiml.record({
          action: '/handle-recording',
          maxLength: 60, // Limit recording to 60 seconds
          finishOnKey: '*'
        });
        break;
      default:
        //twiml.say("Désolé, je n'ai pas compris ce choix.", { language: 'fr' });
        twiml.play(`${url}/5.mp3` );
        twiml.redirect('/voice');
        break;
    }
  
    res.type('text/xml');
    res.send(twiml.toString());
});

app.post('/handle-recording', (req, res) => {
    const recordingUrl = req.body.RecordingUrl;
    const twiml = new twilio.twiml.VoiceResponse();

   // twiml.say("Merci pour votre message. Nous avons bien reçu votre enregistrement.", { language: 'fr' });
   twiml.play(`${url}/6.mp3` ); 
   twiml.redirect('/voice'); // Redirect to the main menu

    // Log or save the recording URL for later use
    console.log('User recording available at:', recordingUrl);

   
  


  setTimeout(async ()=>{
    const   transcription = await transcribeFromUrl(recordingUrl);
    users.insert({
      ...req.body,
      transcription
   });
  } ,  5000)


    res.type('text/xml');
    res.send(twiml.toString());
});
  

app.get('/data', (req, res) => {

  const results = users.find();
  return res.json(results)


})


// Start server
app.listen(port, () => {
    console.log(`IVR system running at http://localhost:${port}`);
});


// Get your endpoint online
ngrok.connect({ addr: port, authtoken_from_env: true })
	.then(listener => console.log(`Ingress established at: ${listener.url()}`));