const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const axios = require('axios');
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

// SFMC Data Extension configuration
const SFMC_CONFIG = {
  dataExtension: {
    name: 'PromptStorage',
    externalKey: '3620CF62-0B6E-4D80-AD37-13F943100960',
    fields: {
      // Field names for API requests (what we send)
      sendFields: {
        id: 'ID',
        name: 'PromptName', 
        content: 'Prompt'
      },
      // Field names in SFMC responses (what we receive - lowercase)
      receiveFields: {
        id: 'id',
        name: 'promptname',
        content: 'prompt'
      }
    }
  }
};

// Function to get SFMC auth token
async function getSFMCToken() {
  try {
    const authResponse = await axios.post(
      `${process.env.SFMC_AUTH_BASE_URI}/v2/token`, 
      {
        grant_type: 'client_credentials',
        client_id: process.env.SFMC_CLIENT_ID,
        client_secret: process.env.SFMC_CLIENT_SECRET
      }
    );
    
    return authResponse.data.access_token;
  } catch (error) {
    console.error('Error getting SFMC auth token:', error.response?.data || error.message);
    throw new Error('Authentication failed');
  }
}

// Function to load brand guidelines from SFMC Data Extension
async function loadBrandGuidelines() {
  try {
    const token = await getSFMCToken();
    
    const response = await axios.get(
      `${process.env.SFMC_REST_BASE_URI}/data/v1/customobjectdata/key/${SFMC_CONFIG.dataExtension.externalKey}/rowset`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('SFMC Response:', JSON.stringify(response.data, null, 2));
    
    // Transform the response to match our expected format
    if (response.data && response.data.items) {
      return response.data.items.map(item => {
        console.log('Processing item:', JSON.stringify(item, null, 2));
        
        // Extract values using the correct lowercase field names
        const id = item.keys ? item.keys[SFMC_CONFIG.dataExtension.fields.receiveFields.id] : null;
        const name = item.values ? item.values[SFMC_CONFIG.dataExtension.fields.receiveFields.name] : null;
        const content = item.values ? item.values[SFMC_CONFIG.dataExtension.fields.receiveFields.content] : null;
        
        console.log('Extracted values:', { id, name, content: content?.substring(0, 50) + '...' });
        
        return {
          id: id,
          name: name,
          content: content,
          createdAt: item.modifiedDate || new Date().toISOString()
        };
      }).filter(item => item.id && item.name); // Filter out items without required fields
    }
    
    return [];
  } catch (error) {
    console.error('Error loading brand guidelines from SFMC:', error.response?.data || error.message);
    return [];
  }
}

// Function to save a brand guideline to SFMC Data Extension
async function saveBrandGuideline(guideline) {
  try {
    const token = await getSFMCToken();
    
    const payload = {
      items: [
        {
          [SFMC_CONFIG.dataExtension.fields.sendFields.id]: guideline.id,
          [SFMC_CONFIG.dataExtension.fields.sendFields.name]: guideline.name,
          [SFMC_CONFIG.dataExtension.fields.sendFields.content]: guideline.content
        }
      ]
    };
    
    console.log('Saving payload to SFMC:', payload);
    
    const response = await axios.post(
      `${process.env.SFMC_REST_BASE_URI}/data/v1/async/dataextensions/key:${SFMC_CONFIG.dataExtension.externalKey}/rows`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('SFMC save response:', response.data);
    return true;
  } catch (error) {
    console.error('Error saving brand guideline to SFMC:', error.response?.data || error.message);
    return false;
  }
}

// Function to delete a brand guideline from SFMC Data Extension
async function deleteBrandGuideline(id) {
  try {
    const token = await getSFMCToken();
    
    // First, we need to get the primary key of the record to delete
    // Using the Web Service API for deletion as it's more reliable for individual record deletion
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope
  xmlns:s="http://www.w3.org/2003/05/soap-envelope"
  xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing"
  xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <a:Action s:mustUnderstand="1">Delete</a:Action>
    <a:To s:mustUnderstand="1">${process.env.SFMC_SOAP_BASE_URI}/Service.asmx</a:To>
    <fueloauth xmlns="http://exacttarget.com">${token}</fueloauth>
  </s:Header>
  <s:Body
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <DeleteRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Options></Options>
      <Objects xsi:type="DataExtensionObject">
        <CustomerKey>${SFMC_CONFIG.dataExtension.externalKey}</CustomerKey>
        <Keys>
          <Key>
            <Name>ID</Name>
            <Value>${id}</Value>
          </Key>
        </Keys>
      </Objects>
    </DeleteRequest>
  </s:Body>
</s:Envelope>`;

    await axios.post(
      `${process.env.SFMC_SOAP_BASE_URI}/Service.asmx`,
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'Delete'
        }
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error deleting brand guideline from SFMC:', error.response?.data || error.message);
    
    // Fallback: Try REST API deletion approach
    try {
      const token = await getSFMCToken();
      
      await axios.delete(
        `${process.env.SFMC_REST_BASE_URI}/data/v1/customobjectdata/key/${SFMC_CONFIG.dataExtension.externalKey}/rows/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return true;
    } catch (fallbackError) {
      console.error('Fallback deletion also failed:', fallbackError.response?.data || fallbackError.message);
      return false;
    }
  }
}

// Debug endpoint to see raw SFMC response
app.get('/api/debug/sfmc-response', async (req, res) => {
  try {
    const token = await getSFMCToken();
    
    const response = await axios.get(
      `${process.env.SFMC_REST_BASE_URI}/data/v1/customobjectdata/key/${SFMC_CONFIG.dataExtension.externalKey}/rowset`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      rawResponse: response.data,
      itemsCount: response.data.items ? response.data.items.length : 0,
      firstItem: response.data.items && response.data.items.length > 0 ? response.data.items[0] : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

// API route to get all brand guidelines
app.get('/api/brand-guidelines', async (req, res) => {
  try {
    console.log('Loading brand guidelines from SFMC...');
    const guidelines = await loadBrandGuidelines();
    console.log(`Loaded ${guidelines.length} brand guidelines`);
    res.json(guidelines);
  } catch (error) {
    console.error('Error in /api/brand-guidelines GET:', error);
    res.status(500).json({ error: 'Failed to load brand guidelines' });
  }
});

// API route to save a new brand guideline
app.post('/api/brand-guidelines', async (req, res) => {
  try {
    const { name, content } = req.body;
    
    console.log('Received save request:', { name, content: content?.substring(0, 100) + '...' });
    
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }
    
    // Create new guideline with unique ID
    const newGuideline = {
      id: Date.now().toString(),
      name: name.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString()
    };
    
    console.log('Saving new guideline:', { id: newGuideline.id, name: newGuideline.name });
    
    const success = await saveBrandGuideline(newGuideline);
    
    if (success) {
      console.log('Successfully saved brand guideline');
      res.status(201).json(newGuideline);
    } else {
      console.log('Failed to save brand guideline');
      res.status(500).json({ error: 'Failed to save brand guideline to SFMC' });
    }
  } catch (error) {
    console.error('Error in /api/brand-guidelines POST:', error);
    res.status(500).json({ error: 'Server error while saving brand guideline' });
  }
});

// API route to delete a brand guideline
app.delete('/api/brand-guidelines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Deleting brand guideline with ID:', id);
    
    const success = await deleteBrandGuideline(id);
    
    if (success) {
      console.log('Successfully deleted brand guideline');
      res.json({ success: true });
    } else {
      console.log('Failed to delete brand guideline');
      res.status(500).json({ error: 'Failed to delete brand guideline from SFMC' });
    }
  } catch (error) {
    console.error('Error in /api/brand-guidelines DELETE:', error);
    res.status(500).json({ error: 'Server error while deleting brand guideline' });
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
      const guidelines = await loadBrandGuidelines();
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
