const fs = require('fs');
const path = require('path');

// Absolute path to translations directory
const translationsDir = path.join(__dirname, '../locales');

// Function to get translation file
exports.getTranslations = (req, res) => {
  const lang = req.params.lang;
  // console.log(translationsDir);
  
  const filePath = path.join(translationsDir, lang, 'translation.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).json({ error: 'Translation file not found' });
    }
    res.json(JSON.parse(data));
  });
};

// Function to update translation file
exports.updateTranslations = (req, res) => {
  const lang = req.params.lang;
  const filePath = path.join(translationsDir, lang, 'translation.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).json({ error: 'Translation file not found' });
    }

    // Parse existing translations and merge with updates
    const translations = JSON.parse(data);
    const updates = req.body;
    const updatedTranslations = { ...translations, ...updates };

    // Write updated translations back to file
    fs.writeFile(filePath, JSON.stringify(updatedTranslations, null, 2), 'utf8', (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update translation file' });
      }
      res.json({ message: 'Translation file updated successfully' });
    });
  });
};
