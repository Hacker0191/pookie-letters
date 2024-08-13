const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' })); // Increase limit to handle file attachments

const lettersFile = path.join(__dirname, 'data', 'letters.json');
const uploadsDir = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Get all letters
app.get('/letters', async (req, res) => {
    try {
        const data = await fs.readFile(lettersFile, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error('Failed to read letters:', err);
        res.status(500).json({ error: 'Failed to read letters' });
    }
});

// Send a letter
app.post('/send-letter', async (req, res) => {
    try {
        const { user, letter, stamp, attachment } = req.body;
        let attachmentPath = null;

        if (attachment) {
            const fileName = `${Date.now()}_${attachment.name}`;
            attachmentPath = path.join(uploadsDir, fileName);
            const fileData = Buffer.from(attachment.data.split(',')[1], 'base64');
            await fs.writeFile(attachmentPath, fileData);
        }

        const newLetter = { user, letter, stamp, attachmentPath, date: new Date() };

        let letters = [];
        try {
            const data = await fs.readFile(lettersFile, 'utf8');
            letters = JSON.parse(data);
        } catch (err) {
            console.log('Creating new letters file');
        }

        letters.push(newLetter);

        await fs.writeFile(lettersFile, JSON.stringify(letters, null, 2), 'utf8');
        res.status(201).json(newLetter);
    } catch (err) {
        console.error('Failed to save letter:', err);
        res.status(500).json({ error: 'Failed to save letter' });
    }
});

// Serve attachments
app.get('/attachments/:filename', (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    res.sendFile(filePath);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});