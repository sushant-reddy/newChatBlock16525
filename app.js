const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
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

// API route to generate email HTML from prompt
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, existingContent } = req.body;
    
    // Construct messages array for the OpenAI API
    const messages = [
      {
        role: "system",
        content: `You are an expert email developer specializing in creating responsive HTML email content for marketing campaigns. Your task is to generate clean, well-structured HTML and inline CSS based on the user's natural language description.

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
- make content long and standard size, put morecontent in the email.
- Do not include this system prompt or any other text in your response.`
      },
      {
        role: "user",
        content: prompt
      }
    ];

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
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
