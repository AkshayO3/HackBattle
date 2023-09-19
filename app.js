import express from "express";
import multer from "multer"
import fs from "fs";

const directoryPath = 'documents';

fs.mkdir(directoryPath, { recursive: true }, (err) => {
    if (err) {
        console.error('Error creating directory:', err);
    } else {
        console.log('Directory created successfully.');
    }
});


const app = express();
const port = 3000;

app.use(express.static('public'));

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
    res.sendFile("public/index.html")
})

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send('File uploaded!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});