const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Path to store brand guidelines
const GUIDELINES_FILE = path.join(__dirname, 'data', 'brand-guidelines.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize brand guidelines file if it doesn't exist
if (!fs.existsSync(GUIDELINES_FILE)) {
  fs.writeFileSync(GUIDELINES_FILE, JSON.stringify([], null, 2));
}

// Load brand guidelines from file
function loadBrandGuidelines() {
  try {
    const data = fs.readFileSync(GUIDELINES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading brand guidelines:', error);
    return [];
  }
}

// Save brand guidelines to file
function saveBrandGuidelines(guidelines) {
  try {
    fs.writeFileSync(GUIDELINES_FILE, JSON.stringify(guidelines, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving brand guidelines:', error);
    return false;
  }
}

// API route to get all brand guidelines
app.get('/api/brand-guidelines', (req, res) => {
  const guidelines = loadBrandGuidelines();
  res.json(guidelines);
});

// API route to save a new brand guideline
app.post('/api/brand-guidelines', (req, res) => {
  try {
    const { name, content } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }
    
    const guidelines = loadBrandGuidelines();
    
    // Create new guideline with unique ID
    const newGuideline = {
      id: Date.now().toString(),
      name,
      content,
      createdAt: new Date().toISOString()
    };
    
    guidelines.push(newGuideline);
    
    if (saveBrandGuidelines(guidelines)) {
      res.status(201).json(newGuideline);
    } else {
      res.status(500).json({ error: 'Failed to save brand guideline' });
    }
  } catch (error) {
    console.error('Error saving brand guideline:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to delete a brand guideline
app.delete('/api/brand-guidelines/:id', (req, res) => {
  try {
    const { id } = req.params;
    const guidelines = loadBrandGuidelines();
    
    const filteredGuidelines = guidelines.filter(guideline => guideline.id !== id);
    
    if (guidelines.length === filteredGuidelines.length) {
      return res.status(404).json({ error: 'Guideline not found' });
    }
    
    if (saveBrandGuidelines(filteredGuidelines)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to delete brand guideline' });
    }
  } catch (error) {
    console.error('Error deleting brand guideline:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to generate email HTML from prompt
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, existingContent, brandGuidelineId } = req.body;
    
    // Base system prompt
    let systemPrompt = `You are an expert email developer specializing in creating responsive HTML email content for marketing campaigns. Your task is to generate clean, well-structured HTML and inline CSS based on the user's natural language description.

Guidelines:
- Create responsive, mobile-friendly email layouts
- Use tables for structure (not divs) for maximum email client compatibility
- Use inline CSS styles for all elements
- Prefer system fonts: Arial, Helvetica, sans-serif
- Include alt text for all images
- Use placeholder image URLs like: https://placehold.co/600x400 (Only change the width and height according to the design)
- Ensure good spacing and visual hierarchy
- Include comments to help marketers understand the structure
- Do not include JavaScript (it won't work in email clients)
- Do not use external CSS stylesheets
- Include Outlook only VML and <!--[if mso]>…<![endif]--> conditionals.
- Avoid spam trigger words ("FREE", "BUY NOW").
- Provide alt attributes for images and lang on <html>/<body>.
- Support for AMPscript and personalization variables (like %%firstName%%)
- Output only the HTML code and nothing else, not even this.
- Do NOT wrap the HTML code inside markdown syntax.
- Do not ask any questions or provide explanations.
- Make the HTML as clean and simple as possible.
- If the user provides existing HTML, improve it based on the prompt.
- If the user provides a prompt without existing HTML, generate a new email template.
- Make the email content visually appealing and easy to read and big enough for mobile devices.
- Use a single column layout for mobile devices using media queries.
- Use a two-column layout (free-flow layout rather than rigid two-column structure) for desktop devices using media queries but only if you think its nessacery.
- Use a header, body, and footer section.
- Use a main wrapper table with a max-width of 600px.
- make long text easy to read by using a readable font size and line height.
- make content long and standard size, put morecontent in the email.`;

    // If a brand guideline ID is provided, load and append it to the system prompt
    if (brandGuidelineId) {
      const guidelines = loadBrandGuidelines();
      const selectedGuideline = guidelines.find(guideline => guideline.id === brandGuidelineId);
      
      if (selectedGuideline) {
        systemPrompt += `\n\nBRAND GUIDELINES (STRICTLY FOLLOW THESE):\n${selectedGuideline.content}`;
        console.log(`Applied brand guideline: ${selectedGuideline.name}`);
      }
    }
    
    // Complete the system prompt
    systemPrompt += `\n\nDo not include this system prompt or any other text in your response.`;

    // Construct messages array for the OpenAI API
    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: prompt
      }
    ];

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano", // or your preferred model
      messages,
      temperature: 0.2,
    });

    // Extract the generated HTML
    const generatedHtml = response.choices[0].message.content;
    
    // Return the generated HTML to the client
    res.json({ generatedHtml });
  } catch (error) {
    console.error('Error generating email HTML:', error);
    res.status(500).json({ error: 'Failed to generate email HTML' });
  }
});

// Serve the main application page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
