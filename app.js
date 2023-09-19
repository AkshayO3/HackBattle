import express from "express";
import multer from "multer"
import fs from "fs";
import twilio from "twilio";

const directoryPath = 'documents';

const app = express();
const port = 3000;

app.use(express.static('public'));

const accountSid = 'ACcd1284ff9c91faa4f72ecb15f25de1dd';
const authToken = 'b855e05cfe38977fcadfec2ee6565370';
const client = twilio(accountSid, authToken);

fs.mkdir(directoryPath, { recursive: true }, (err) => {
    if (err) {
        console.error('Error creating directory:', err);
    } else {
        console.log('Directory created successfully.');
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'documents/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });
app.get("/",(req,res)=>{
    res.render("home.ejs")
})

app.get("/claims",(req,res)=>{
    res.render("claims.ejs");
})

app.post("/claims",(req,res)=>{
    client.messages
        .create({
            body: 'Alpha2 testing enabled.',
            from: '+12564483528',
            to: '+918002215433',
        })
        .then((message) => console.log('SMS sent:', message.sid))
        .catch((error) => console.error('Error sending SMS:', error)).then(()=>{res.render("home.ejs")});
})

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send('File uploaded!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});