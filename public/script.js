// Initialize the Block SDK
let sdk;
let codeEditor;
let currentEmailContent = '';
let lastPrompt = '';
let savedPrompts = [];

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing app...');
  
  // Initialize the Block SDK - this needs to happen first to correctly load saved data
  if (window.sfdc && window.sfdc.BlockSDK) {
    sdk = new window.sfdc.BlockSDK();
    if (sdk.setBlockEditorWidth) {
      sdk.setBlockEditorWidth(700, function() {
        console.log('Block editor width set to 700px');
      });
    }
    // Initialize with saved data from BlockSDK
    initializeWithSavedData();
  } else {
    console.warn('BlockSDK not available. Running in development mode.');
  }

  // Initialize UI elements after SDK setup
  initializeUIElements();
  
  // Load brand guidelines from server
  loadBrandGuidelines();
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
    
    // Load last used guideline if available
    if (data && data.lastUsedGuidelineId) {
      const dropdown = document.getElementById('brand-guidelines-dropdown');
      if (dropdown) {
        // We'll set this after the dropdown is populated
        setTimeout(() => {
          dropdown.value = data.lastUsedGuidelineId;
        }, 500);
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

// Function to load brand guidelines from server
async function loadBrandGuidelines() {
  try {
    const response = await fetch('/api/brand-guidelines');
    if (!response.ok) {
      throw new Error('Failed to fetch brand guidelines');
    }
    
    const guidelines = await response.json();
    
    // Update UI with fetched guidelines
    populateBrandGuidelinesDropdown(guidelines);
    
    console.log('Loaded brand guidelines from server:', guidelines);
    
    // If there are no guidelines yet, show a helpful message
    if (guidelines.length === 0) {
      const dropdown = document.getElementById('brand-guidelines-dropdown');
      if (dropdown) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No brand guidelines saved yet";
        dropdown.appendChild(option);
      }
    }
    
    // Restore last used guideline if there was one
    if (sdk) {
      sdk.getData((data) => {
        if (data && data.lastUsedGuidelineId) {
          const dropdown = document.getElementById('brand-guidelines-dropdown');
          if (dropdown) {
            dropdown.value = data.lastUsedGuidelineId;
          }
        }
      });
    }
  } catch (error) {
    console.error('Error loading brand guidelines:', error);
    showError('Failed to load brand guidelines from server.');
  }
}

// Function to populate brand guidelines dropdown from server data
function populateBrandGuidelinesDropdown(guidelines) {
  const dropdown = document.getElementById('brand-guidelines-dropdown');
  if (!dropdown) return;
  
  // Clear existing options except the first one
  while (dropdown.options.length > 1) {
    dropdown.remove(1);
  }
  
  // Add guidelines to dropdown
  guidelines.forEach(guideline => {
    const option = document.createElement('option');
    option.value = guideline.id;
    option.textContent = guideline.name;
    dropdown.appendChild(option);
  });
  
  console.log('Populated dropdown with', guidelines.length, 'brand guidelines');
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
  
// Event listener for brand guidelines dropdown
const dropdown = document.getElementById('brand-guidelines-dropdown');
const deleteGuidelineBtn = document.getElementById('delete-guideline-btn');
if (dropdown) {
  dropdown.addEventListener('change', (e) => {
    const selectedValue = e.target.value;
    
    // Enable/disable delete button based on selection
    if (deleteGuidelineBtn) {
      deleteGuidelineBtn.disabled = !selectedValue;
    }
    
    if (selectedValue) {
      console.log('Brand guideline selected:', selectedValue);
      
      // Save the selected guideline ID to BlockSDK
      if (sdk) {
        sdk.getData(existingData => {
          const dataToSave = { 
            ...existingData,
            lastUsedGuidelineId: selectedValue
          };
          
          sdk.setData(dataToSave, () => {
            console.log('Saved selected guideline ID to BlockSDK:', selectedValue);
          });
        });
      }
    }
  });
}
  
  // Event listener for save prompt button
  const savePromptBtn = document.getElementById('save-prompt-btn');
  if (savePromptBtn) {
    savePromptBtn.addEventListener('click', saveCurrentPrompt);
  }

  // Event listener for delete guideline button
if (deleteGuidelineBtn) {
  deleteGuidelineBtn.addEventListener('click', deleteSelectedGuideline);
  // Initially disable the button until a guideline is selected
  deleteGuidelineBtn.disabled = true;
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

// Modified to save brand guidelines to server
async function saveCurrentPrompt() {
  const promptInput = document.getElementById('prompt-input');
  const promptNameInput = document.getElementById('prompt-name');
  
  if (!promptInput || !promptNameInput) {
    console.error('Prompt inputs not found');
    return;
  }
  
  const promptContent = promptInput.value.trim();
  const promptName = promptNameInput.value.trim();
  
  if (!promptContent) {
    showError('Please enter a prompt to save.');
    return;
  }
  
  if (!promptName) {
    showError('Please enter a name for this brand guideline.');
    return;
  }
  
  try {
    // Save to server
    const response = await fetch('/api/brand-guidelines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: promptName,
        content: promptContent
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save brand guideline');
    }
    
    const newGuideline = await response.json();
    console.log('Brand guideline saved to server:', newGuideline);
    
    // Reload guidelines from server to refresh the UI
    loadBrandGuidelines();
    
    // Clear prompt name input
    promptNameInput.value = '';
    
    showTemporaryMessage('Brand guideline saved successfully!');
  } catch (error) {
    console.error('Error saving brand guideline:', error);
    showError('Failed to save brand guideline. Please try again.');
  }
}

function showTemporaryMessage(message) {
  // Create and show temporary success message
  const messageElement = document.createElement('div');
  messageElement.className = 'success-message';
  messageElement.textContent = message;
  
  // Insert after the save button
  const saveBtn = document.getElementById('save-prompt-btn');
  if (saveBtn && saveBtn.parentNode) {
    saveBtn.parentNode.appendChild(messageElement);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 3000);
  }
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

  // Get selected brand guideline, if any
  const guidelineDropdown = document.getElementById('brand-guidelines-dropdown');
  const selectedGuidelineId = guidelineDropdown ? guidelineDropdown.value : '';

  // Show loading indicator
  showLoading(true);
  hideError();

  try {
    console.log('Sending API request with prompt:', prompt);
    console.log('Using existing content length:', currentEmailContent ? currentEmailContent.length : 0);
    console.log('Selected brand guideline ID:', selectedGuidelineId);
    
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        prompt, 
        existingContent: currentEmailContent,
        brandGuidelineId: selectedGuidelineId || null
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
      sdk.getData(existingData => {
        const dataToSave = { 
          ...existingData,
          lastPrompt: prompt,
          savedHtmlContent: currentEmailContent,
          lastUpdated: new Date().toISOString(),
          lastUsedGuidelineId: selectedGuidelineId || null
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
    sdk.getData(existingData => {
      const dataToSave = { 
        ...existingData,
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


// Function to delete the selected brand guideline
async function deleteSelectedGuideline() {
  const dropdown = document.getElementById('brand-guidelines-dropdown');
  if (!dropdown || !dropdown.value) {
    showError('Please select a brand guideline to delete.');
    return;
  }
  
  const guidelineId = dropdown.value;
  const guidelineName = dropdown.options[dropdown.selectedIndex].text;
  
  if (!confirm(`Are you sure you want to delete the "${guidelineName}" brand guideline?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/brand-guidelines/${guidelineId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete brand guideline');
    }
    
    // Reload guidelines and reset dropdown
    await loadBrandGuidelines();
    
    // Reset selection if it was the selected guideline in the SDK
    if (sdk) {
      sdk.getData(existingData => {
        if (existingData && existingData.lastUsedGuidelineId === guidelineId) {
          const dataToSave = { 
            ...existingData,
            lastUsedGuidelineId: null
          };
          
          sdk.setData(dataToSave, () => {
            console.log('Reset lastUsedGuidelineId in BlockSDK');
          });
        }
      });
    }
    
    showTemporaryMessage('Brand guideline deleted successfully!');
  } catch (error) {
    console.error('Error deleting brand guideline:', error);
    showError('Failed to delete brand guideline. Please try again.');
  }
}
