// Initialize the Block SDK
let sdk;
let codeEditor;
let currentEmailContent = '';
let lastPrompt = '';

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing app...');
  
  // Initialize the Block SDK - this needs to happen first to correctly load saved data
  if (window.sfdc && window.sfdc.BlockSDK) {
    console.log('SFMC environment detected, initializing BlockSDK');
    sdk = new window.sfdc.BlockSDK();
    
    // Initialize with saved data from BlockSDK
    initializeWithSavedData();
  } else {
    console.warn('BlockSDK not available. Running in development mode.');
  }

  // Initialize UI elements after SDK setup
  initializeUIElements();
});

function initializeWithSavedData() {
  console.log('Loading saved data from BlockSDK...');
  
  // First retrieve data containing the prompt and any other metadata
  sdk.getData((data) => {
    console.log('Retrieved data:', data);
    
    // Load last prompt if available
    if (data && data.lastPrompt) {
      lastPrompt = data.lastPrompt;
      const promptInput = document.getElementById('prompt-input');
      if (promptInput) {
        promptInput.value = lastPrompt;
        console.log('Restored last prompt:', lastPrompt);
      }
    }
    
    // Then retrieve the actual content
    sdk.getContent((content) => {
      console.log('Retrieved content length:', content ? content.length : 0);
      
      if (content && content.trim() !== '') {
        // Use the content from getContent as primary source
        currentEmailContent = content;
        const previewElement = document.getElementById('email-preview');
        if (previewElement) {
          previewElement.innerHTML = content;
          console.log('Restored content from getContent');
        }
      } else if (data && data.savedHtmlContent && data.savedHtmlContent.trim() !== '') {
        // Fallback to content stored in data if getContent is empty
        currentEmailContent = data.savedHtmlContent;
        const previewElement = document.getElementById('email-preview');
        if (previewElement) {
          previewElement.innerHTML = data.savedHtmlContent;
          console.log('Restored content from getData');
        }
      }
    });
  });
 
}

function initializeUIElements() {
  console.log('Initializing UI elements...');
  
  // Initialize CodeMirror editor
  const codeEditorElement = document.getElementById('code-editor');
  if (codeEditorElement) {
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
    console.log('CodeMirror editor initialized');
  }

  // Event listeners for UI elements
  const generateBtn = document.getElementById('generate-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', generateEmailHTML);
  }
  
  const editCodeBtn = document.getElementById('edit-code-btn');
  if (editCodeBtn) {
    editCodeBtn.addEventListener('click', openCodeEditor);
  }
  
  const applyChangesBtn = document.getElementById('apply-changes-btn');
  if (applyChangesBtn) {
    applyChangesBtn.addEventListener('click', applyCodeChanges);
  }
  
  const closeModalBtn = document.querySelector('.close-modal');
  const cancelBtn = document.getElementById('cancel-changes-btn');
  const codeModal = document.getElementById('code-modal');
  
  if (closeModalBtn && codeModal) {
    closeModalBtn.addEventListener('click', () => {
      codeModal.style.display = 'none';
    });
  }
  
  if (cancelBtn && codeModal) {
    cancelBtn.addEventListener('click', () => {
      codeModal.style.display = 'none';
    });
  }
  
  console.log('All UI event listeners attached');
}

async function generateEmailHTML() {
  console.log('Generating email HTML...');
  
  const promptInput = document.getElementById('prompt-input');
  if (!promptInput) {
    console.error('Prompt input element not found');
    return;
  }
  
  const prompt = promptInput.value.trim();
  
  if (!prompt) {
    showError('Please enter a prompt to generate the email HTML.');
    return;
  }

  // Show loading indicator
  showLoading(true);
  hideError();

  try {
    console.log('Sending API request with prompt:', prompt);
    console.log('Using existing content length:', currentEmailContent ? currentEmailContent.length : 0);
    
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
    const previewElement = document.getElementById('email-preview');
    if (previewElement) {
      previewElement.innerHTML = currentEmailContent;
    }
    
    lastPrompt = prompt;

    // Save the generated content and prompt
    if (sdk) {
      console.log('Saving to BlockSDK...');
      
      // Save data first
      const dataToSave = { 
        lastPrompt: prompt,
        savedHtmlContent: currentEmailContent,
        lastUpdated: new Date().toISOString()
      };
      
      console.log('Saving data:', dataToSave);
      sdk.setData(dataToSave, (dataResult) => {
        console.log('SDK data saved successfully:', dataResult);
        
        // Then save content
        console.log('Saving content of length:', currentEmailContent.length);
        sdk.setContent(currentEmailContent, (contentResult) => {
          console.log('SDK content saved successfully:', contentResult);
        });
      });
    } else {
      console.warn('SDK not available, cannot save data');
    }

  } catch (error) {
    showError(error.message || 'An error occurred while generating the email HTML.');
    console.error('Error generating email HTML:', error);
  } finally {
    showLoading(false);
  }
}

function openCodeEditor() {
  console.log('Opening code editor...');
  
  // Set the current HTML content in the code editor
  if (codeEditor) {
    codeEditor.setValue(currentEmailContent || '');
    codeEditor.refresh(); // Ensure proper rendering
  }
  
  const codeModal = document.getElementById('code-modal');
  if (codeModal) {
    codeModal.style.display = 'block';
  }
}

function applyCodeChanges() {
  console.log('Applying code changes...');
  
  if (!codeEditor) {
    console.error('Code editor not initialized');
    return;
  }
  
  // Get the updated code from the editor
  const updatedCode = codeEditor.getValue();
  
  // Update the preview and save the changes
  const previewElement = document.getElementById('email-preview');
  if (previewElement) {
    previewElement.innerHTML = updatedCode;
  }
  
  currentEmailContent = updatedCode;
  
  // Save changes to BlockSDK (both content and data)
  if (sdk) {
    console.log('Saving edited content to BlockSDK...');
    
    // Save data first
    const dataToSave = { 
      lastPrompt: lastPrompt,
      savedHtmlContent: updatedCode,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('Saving data after edit:', dataToSave);
    sdk.setData(dataToSave, (dataResult) => {
      console.log('SDK data saved successfully after edit:', dataResult);
      
      // Then save content
      console.log('Saving content of length after edit:', updatedCode.length);
      sdk.setContent(updatedCode, (contentResult) => {
        console.log('SDK content saved successfully after edit:', contentResult);
      });
    });
  } else {
    console.warn('SDK not available, cannot save data after edit');
  }
  
  // Close the modal
  const codeModal = document.getElementById('code-modal');
  if (codeModal) {
    codeModal.style.display = 'none';
  }
}

function showLoading(isLoading) {
  const loadingIndicator = document.getElementById('loading-indicator');
  const generateBtn = document.getElementById('generate-btn');
  
  if (loadingIndicator) {
    if (isLoading) {
      loadingIndicator.classList.remove('hidden');
    } else {
      loadingIndicator.classList.add('hidden');
    }
  }
  
  if (generateBtn) {
    generateBtn.disabled = isLoading;
  }
}

function showError(message) {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
}

function hideError() {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.classList.add('hidden');
  }
}
