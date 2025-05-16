# EmailBlockBuilder - Salesforce Marketing Cloud Custom Content Block

This is a complete Salesforce Marketing Cloud Custom Content Block application that generates email HTML code using OpenAI's API based on natural language prompts.

## Features

- Natural language prompt interface for generating email HTML
- Real-time integration with Salesforce Marketing Cloud Block SDK
- Code editor for manually tweaking generated HTML/CSS
- Responsive email templates optimized for all email clients
- Persistence of both content and user prompts

## Installation and Setup

### Prerequisites

- Node.js (v14+)
- Salesforce Marketing Cloud account with Content Builder access
- OpenAI API key

### Setup Instructions

1. Clone this repository to your local machine or server
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```
4. Start the application:
   ```
   npm start
   ```

### Deploying to Salesforce Marketing Cloud

1. Host this application on a secure (HTTPS) server
2. In Salesforce Marketing Cloud, navigate to Content Builder
3. Click on "Create" and select "Custom Content Block"
4. Provide the following information:
   - Name: EmailBlockBuilder
   - Description: Generate email HTML from natural language prompts
   - Endpoint URL: https://your-hosted-application-url.com
   - Category: Select appropriate category
5. Click "Save"

## How to Use

1. When creating an email in Content Builder, add the "EmailBlockBuilder" custom block
2. Enter a natural language prompt describing the email design you want
3. Click "Generate Email HTML"
4. The generated HTML will be displayed in the preview pane
5. To make manual adjustments, click "Edit HTML/CSS"
6. Make your changes in the code editor and click "Apply Changes"
7. Save your email in Content Builder

## Example Prompt

```
Generate a responsive two-column layout with a hero image (alt="Hero"), headline in 'Helvetica, Arial, sans-serif', body text, and a 4px‐rounded CTA button. Ensure a 480px mobile breakpoint, full Outlook support, and no spam words.
```

## Technical Architecture

- **Frontend**: HTML, CSS, JavaScript with CodeMirror for syntax highlighting
- **Backend**: Node.js with Express
- **AI**: OpenAI API (GPT-4.1-nano model)
- **Integration**: Salesforce Marketing Cloud Block SDK

## File Structure

- `app.js` - Express server and OpenAI API integration
- `public/index.html` - Main UI template
- `public/styles.css` - CSS styling
- `public/script.js` - Client-side JavaScript
- `public/block-sdk.js` - Salesforce Marketing Cloud Block SDK integration

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please contact the developer at support@emailblockbuilder.com