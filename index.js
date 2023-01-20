const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const multer = require('multer')
const S3 = require('aws-sdk/clients/s3.js')
const fs = require('fs')
const Airtable = require('airtable')
const dotenv = require('dotenv')

const app = express()
const port = 4000;

app.use(cors())
dotenv.config()

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const sleep = second => {
  return new Promise((resolve) => {
    setTimeout(resolve, second * 1000)
  })
}

const s3 = new S3({
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    signatureVersion: process.env.S3_SIGNATURE_VERSION,
});


const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base('appIMCO0Atpb8v58Z');

const convertVoice = async (req, res) => {
    // console.log(req.file)
    const speakers = JSON.parse(req.body.speaker)
    let result = []
    // console.log(speakers)
    const sourceFileName = String(new Date().getTime()) + `_${req.file.originalname}`
      for(const speaker of speakers){
      // waiting for 5 seconds
      sleep(2)

        const targetFile = fs.readFileSync(`files/${speaker}.wav`)
        const targetFileName = String(new Date().getTime()) + `_${req.file.originalname}` + `_${speaker}`
        
        await s3.putObject({ Bucket: 'metavoice-bucket', Body: req.file.buffer, Key: sourceFileName}).promise()

        await s3.putObject({ Bucket: 'metavoice-bucket',Body: targetFile, Key: targetFileName}).promise()
        const url = await s3.getSignedUrlPromise('getObject', { Bucket: 'metavoice-bucket', Key: targetFileName, Expires: 3600 })
        console.log(url)
        result.push({speaker, url})
        base('Metavoice').create([
          {
            "fields": {
              "source": sourceFileName,
              "target": targetFileName,
              "speaker": speaker
            }
          }
        ], (err, records) => {
          if(err) console.log(err)
          // records.forEach( record => console.log(record.getId()))
        })
      }

      return res.send(result)
}

app.post('/convertVoice', multer().single('file'), convertVoice)

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`))