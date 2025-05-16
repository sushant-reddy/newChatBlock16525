// Initialize the Block SDK
let sdk;
let codeEditor;
let currentEmailContent = '';
let lastPrompt = '';

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the Block SDK if in SFMC environment
  if (!sdk) {
        sdk = new window.sfdc.BlockSDK();
        console.log('BlockSDK instance created:', sdk);
    } else if (!window.BlockSDK) {
        console.error('BlockSDK is not available on window object.');
  }

  // Initialize UI elements
  initializeUIElements();

  const codeModal = document.getElementById('code-modal');
  const closeModalBtn = document.querySelector('.close-modal');
  const cancelBtn = document.getElementById('cancel-changes-btn');

  function closeModal() {
    codeModal.classList.add('hidden');
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModal);
  }
});

function initializeBlockSDK() {
  // Get content that was previously saved
  sdk.getContent(content => {
    if (content && content.trim() !== '') {
      currentEmailContent = content;
      document.getElementById('email-preview').innerHTML = content;
    }
  });

  // Get the last prompt that was used
  sdk.getData(data => {
    if (data.lastPrompt) {
      lastPrompt = data.lastPrompt;
      document.getElementById('prompt-input').value = lastPrompt;
    }
  });

  // Set the block height appropriately
  sdk.setHeight(800);
}

function initializeUIElements() {
  // Initialize CodeMirror editor
  const codeEditorElement = document.getElementById('code-editor');
  codeEditor = CodeMirror.fromTextArea(codeEditorElement, {
    mode: 'htmlmixed',
    theme: 'monokai',
    lineNumbers: true,
    autoCloseTags: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true
  });

  // Event listeners for UI elements
  document.getElementById('generate-btn').addEventListener('click', generateEmailHTML);
  document.getElementById('edit-code-btn').addEventListener('click', openCodeEditor);
  document.getElementById('apply-changes-btn').addEventListener('click', applyCodeChanges);
  document.querySelector('.close-modal').addEventListener('click', closeCodeEditor);
  document.getElementById('cancel-changes-btn').addEventListener('click', closeCodeEditor);
}

async function generateEmailHTML() {
  const promptInput = document.getElementById('prompt-input');
  const prompt = promptInput.value.trim();
  
  if (!prompt) {
    showError('Please enter a prompt to generate the email HTML.');
    return;
  }

  // Show loading indicator
  showLoading(true);
  hideError();

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        prompt, 
        existingContent: currentEmailContent
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate email HTML');
    }

    const data = await response.json();
    
    // Update the email preview with generated HTML
    currentEmailContent = data.generatedHtml;
    document.getElementById('email-preview').innerHTML = currentEmailContent;

    // Save the generated content and prompt
    if (sdk) {
      sdk.setContent(currentEmailContent);
      sdk.setData({ lastPrompt: prompt });
      lastPrompt = prompt;
    }

  } catch (error) {
    showError(error.message || 'An error occurred while generating the email HTML.');
    console.error('Error:', error);
  } finally {
    showLoading(false);
  }
}

function openCodeEditor() {
  codeEditor.setValue(currentEmailContent);
  codeEditor.refresh();
  document.getElementById('code-modal').style.display = 'block';
}

function closeCodeEditor() {
  document.getElementById('code-modal').style.display = 'none';
}

function applyCodeChanges() {
  // Get the updated code from the editor
  const updatedCode = codeEditor.getValue();
  
  // Update the preview and save the changes
  document.getElementById('email-preview').innerHTML = updatedCode;
  currentEmailContent = updatedCode;
  
  // Save changes to BlockSDK
  if (sdk) {
    sdk.setContent(updatedCode);
  }
  
  // Close the modal
  closeCodeEditor();
}

function showLoading(isLoading) {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (isLoading) {
    loadingIndicator.classList.remove('hidden');
    document.getElementById('generate-btn').disabled = true;
  } else {
    loadingIndicator.classList.add('hidden');
    document.getElementById('generate-btn').disabled = false;
  }
}

function showError(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-message').classList.add('hidden');
}
