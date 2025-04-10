// Declare global variables at the top
const chatBox = document.getElementById("chat-box");
let chatInput = document.getElementById("chat-input");
let sendButton = document.getElementById("send-button");
let chatContainer = document.getElementById("chat-container");

// Initialize - Add toggle button if it doesn't exist
function initChatInterface() {
  console.log('Initializing chat interface...');
  
  // Re-query elements to ensure they exist (in case DOM wasn't ready before)
  chatContainer = document.getElementById('chat-container');
  
  // If chat container doesn't exist, create the entire chat interface
  if (!chatContainer) {
    createChatInterface();
  }
  
  // Re-query elements after possible creation
  chatContainer = document.getElementById('chat-container');
  const chatMessages = document.getElementById('chat-messages');
  chatInput = document.getElementById('chat-input');
  sendButton = document.getElementById('send-button');
  const chatToggle = document.getElementById('chat-toggle');
  
  // If chat toggle doesn't exist, create it
  if (!document.getElementById('chat-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'chat-toggle';
    toggleBtn.innerHTML = '<i class="fas fa-robot"></i><span class="notification-badge">1</span>';
    toggleBtn.title = 'Chat with AI Assistant';
    toggleBtn.addEventListener('click', toggleChat);
    document.body.appendChild(toggleBtn);
  }
  
  // Initially hide the chat
  if (chatContainer) {
    // Make sure the display property is set correctly for the hidden class to work
    chatContainer.classList.add('hidden');
    chatContainer.style.display = 'flex'; // This ensures the flex layout is applied when shown
  }

  // Clear any existing messages
  if (chatBox) {
    chatBox.innerHTML = '';
  }
  
  // Add close button functionality
  const closeBtn = document.getElementById('chat-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (chatContainer) {
        chatContainer.classList.add('hidden');
      }
    });
  }
  
  // Create chat input row if it doesn't exist
  let chatInputRow = document.getElementById('chat-input-row');
  if (!chatInputRow && chatContainer) {
    // Create the chat input row for better structure and styling
    chatInputRow = document.createElement('div');
    chatInputRow.id = 'chat-input-row';
    chatInputRow.className = 'chat-input-row';
    chatInputRow.style.display = 'flex';
    chatInputRow.style.width = '100%';
    chatInputRow.style.position = 'relative';
    chatInputRow.style.zIndex = '10';
    chatContainer.appendChild(chatInputRow);
    
    // Move existing input and button into the new row if they exist
    if (chatInput) chatInputRow.appendChild(chatInput);
    if (sendButton) chatInputRow.appendChild(sendButton);
  }
  
  // Make send button more accessible on mobile
  if (window.innerWidth <= 576 && sendButton) {
    sendButton.style.position = 'relative';
    sendButton.style.zIndex = '20';
    sendButton.style.minWidth = '60px'; // Ensure button is wide enough to tap
    sendButton.style.height = '44px';
    sendButton.style.marginLeft = '8px';
    
    // Make sure chat input has correct styles
    if (chatInput) {
      chatInput.style.flex = '1';
      chatInput.style.minHeight = '44px';
    }
    
    // Move toggle button to bottom left on mobile for better accessibility
    const toggleButton = document.getElementById('chat-toggle');
    if (toggleButton && window.innerWidth <= 480) {
      toggleButton.style.left = '10px';
      toggleButton.style.right = 'auto';
      toggleButton.style.bottom = '100px'; // Moved higher on mobile screens
    }
  }
}

// Toggle chat visibility
function toggleChat() {
  const chatBox = document.getElementById("chat-box");
  const chatContainer = document.getElementById('chat-container');
  const chatToggle = document.getElementById('chat-toggle');
  
  const isFirstOpen = chatContainer.classList.contains('hidden') && (!chatBox || chatBox.childElementCount === 0);
  
  // Toggle visibility using the hidden class
  chatContainer.classList.toggle('hidden');
  
  // Update toggle button appearance
  if (chatContainer.classList.contains('hidden')) {
    chatToggle.innerHTML = '<i class="fas fa-robot"></i><span class="notification-badge">1</span>';
    chatToggle.title = 'Open AI Assistant';
    chatToggle.classList.remove('active');
  } else {
    chatToggle.innerHTML = '<i class="fas fa-times"></i>';
    chatToggle.title = 'Close AI Assistant';
    chatToggle.classList.add('active');
    
    // Check if mobile view and adjust the chat container
    if (window.innerWidth <= 576) {
      chatContainer.style.width = '100%';
      chatContainer.style.height = '60vh';
      chatContainer.style.bottom = '0';
      chatContainer.style.right = '0';
      chatContainer.style.left = '0';
      chatContainer.style.borderRadius = '20px 20px 0 0';
    }
  }
  
  // First time opening - show welcome message
  if (isFirstOpen) {
    // Make sure we have a reference to chat box
    const chatBoxRef = chatBox || document.getElementById("chat-box");
    if (chatBoxRef) {
      addSystemMessage("👋 Welcome to AI Assistant! I can help explain questions and provide information about the Australian Citizenship Test.");
      addSystemMessage("Select a question and ask me anything about it!");
      
      // Show an example of what users can ask
      setTimeout(() => {
        addSystemMessage("Try asking: \"Why is this answer correct?\" or \"Tell me more about this topic.\"");
      }, 1000);
    }
  }
  
  // Focus on input when showing chat
  if (!chatContainer.classList.contains('hidden')) {
    // Remove notification badge when chat is opened
    const badge = document.querySelector('#chat-toggle .notification-badge');
    if (badge) badge.style.display = 'none';
    
    // Focus the input field
    const chatInput = document.getElementById('chat-input');
    if (chatInput) chatInput.focus();
  }
}

// Get the current question and answer from the page
function getCurrentQuestionAndAnswer() {
  // Try to get the question text from the page
  const questionText = document.getElementById("question-text")?.textContent || "";
  
  // Try to find the correct answer (the option with 'correct' class)
  const correctOption = document.querySelector('.option.correct');
  const answerText = correctOption ? correctOption.textContent.trim() : "";
  
  return { question: questionText, answer: answerText };
}

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  
  // Create message content div (to separate from timestamp)
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  contentDiv.textContent = text;
  div.appendChild(contentDiv);
  
  // Add timestamp
  const timestamp = document.createElement("span");
  timestamp.className = "timestamp";
  timestamp.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  div.appendChild(timestamp);
  
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Helper to add system messages (without timestamp)
function addSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "message system";
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Generate a simple fallback response when the API fails
function generateFallbackResponse(userQuestion, questionText, answerText) {
  if (!questionText || !answerText) {
    return "I'm sorry, I can't access the question details right now. Please try again later.";
  }
  
  if (userQuestion.toLowerCase().includes("why")) {
    return `This question is asking about "${questionText}". The correct answer is "${answerText}". This is an important fact about Australian citizenship that you should remember.`;
  } else {
    return `The question is "${questionText}" and the correct answer is "${answerText}". I'm sorry I can't provide more detailed information right now.`;
  }
}

async function askAI(event) {
  console.log('askAI function called');
  
  // Prevent default if event is provided
  if (event && event.preventDefault) {
    event.preventDefault();
  }
  
  // Get chat input value
  const chatInput = document.getElementById("chat-input");
  if (!chatInput) {
    console.error('Chat input element not found');
    return;
  }
  
  const userQuestion = chatInput.value.trim();
  console.log('User question:', userQuestion);
  
  if (!userQuestion) {
    console.log('Empty question, not proceeding');
    return;
  }
  
  console.log('Processing AI question:', userQuestion);

  addMessage(userQuestion, "user");
  chatInput.value = "";
  
  // Create typing indicator
  const typingIndicator = document.createElement("div");
  typingIndicator.className = "message system typing-indicator";
  typingIndicator.innerHTML = "<span>AI is thinking</span><span class='dots'><span>.</span><span>.</span><span>.</span></span>";
  chatBox.appendChild(typingIndicator);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Get current question and answer
  const { question, answer } = getCurrentQuestionAndAnswer();

  try {
    const res = await fetch("/api/ai/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, userQuestion }),
    });

    if (!res.ok) {
      console.error(`Server error: ${res.status} ${res.statusText}`);
      throw new Error(`Server error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const explanation = data.explanation || "Sorry, no response from AI.";
    typingIndicator.remove();
    addMessage(explanation, "ai");
  } catch (err) {
    console.error('AI Error:', err);
    typingIndicator.remove();
    
    // Use fallback response instead of just showing an error
    const fallbackResponse = generateFallbackResponse(userQuestion, question, answer);
    addMessage(fallbackResponse, "ai");
    
    // Add small note about API error
    const errorNote = document.createElement("div");
    errorNote.className = "message system error-note";
    errorNote.textContent = "Note: Using simplified responses due to server issues.";
    chatBox.appendChild(errorNote);
  }
}

// Show notification for new practice sessions
function showNewFeatureNotification() {
  const badge = document.querySelector('#chat-toggle .notification-badge');
  if (badge) badge.style.display = 'flex';
}

// Create paper plane icon button (no text)
function createPaperPlaneButton() {
  console.log('Creating paper plane icon button');
  
  // Remove any existing send button if it exists
  const existingButton = document.getElementById('send-button');
  if (existingButton) {
    existingButton.remove();
  }
  
  // Create a new button with ONLY the paper plane icon (no text)
  const iconButton = document.createElement('button');
  iconButton.id = 'send-button';
  iconButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
  
  // Style the button for better visibility and tap target size
  iconButton.style.minWidth = '50px';
  iconButton.style.height = '42px';
  iconButton.style.position = 'relative';
  iconButton.style.zIndex = '100';
  iconButton.style.marginLeft = '8px';
  iconButton.style.backgroundColor = '#0056b3';
  iconButton.style.color = 'white';
  iconButton.style.border = 'none';
  iconButton.style.borderRadius = '4px';
  iconButton.style.cursor = 'pointer';
  iconButton.style.touchAction = 'manipulation';
  iconButton.style.display = 'flex';
  iconButton.style.alignItems = 'center';
  iconButton.style.justifyContent = 'center';
  
  // Add event listeners with debugging
  iconButton.onclick = function(e) {
    console.log('Paper plane button clicked');
    e.preventDefault();
    askAI();
    return false;
  };
  
  // Add touchend event for mobile
  iconButton.addEventListener('touchend', function(e) {
    console.log('Touch ended on paper plane button');
    e.preventDefault();
    askAI();
  });
  
  return iconButton;
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded - initializing chat');
  initChatInterface();
  
  // Create and add the paper plane icon button (no text)
  const chatInputRow = document.getElementById('chat-input-row');
  if (chatInputRow) {
    const paperPlaneButton = createPaperPlaneButton();
    chatInputRow.appendChild(paperPlaneButton);
  }
  
  // Re-get references after DOM is fully loaded
  chatInput = document.getElementById("chat-input");
  sendButton = document.getElementById("send-button");
  
  if (chatInput) {
    // Clear any existing event listeners
    const newChatInput = chatInput.cloneNode(true);
    chatInput.parentNode.replaceChild(newChatInput, chatInput);
    chatInput = newChatInput;
    
    // Add event listener for Enter key
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        console.log('Enter key pressed in chat input');
        e.preventDefault();
        askAI();
      }
    });
  }
  
  // Show notification when new questions are loaded
  const startPracticeBtn = document.querySelector('.start-practice-btn');
  if (startPracticeBtn) {
    startPracticeBtn.addEventListener('click', () => {
      setTimeout(showNewFeatureNotification, 2000); // Show notification after 2 seconds when practice starts
    });
  }
  
  // Apply mobile styles immediately on load
  applyResponsiveStyles();
  
  // Handle window resize events to adjust UI
  window.addEventListener('resize', applyResponsiveStyles);
});

// Create complete chat interface programmatically
function createChatInterface() {
  console.log('Creating complete chat interface');
  
  // Create chat container
  const container = document.createElement('div');
  container.id = 'chat-container';
  container.className = 'chat-container hidden';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'chat-header';
  header.innerHTML = `
    <div class="chat-title">
      <i class="fas fa-robot"></i>
      AI Study Assistant
    </div>
    <button id="chat-close" class="chat-close">&times;</button>
  `;
  
  // Create chat box
  const chatBox = document.createElement('div');
  chatBox.id = 'chat-box';
  chatBox.className = 'chat-box';
  
  // Add welcome message
  const welcomeMsg = document.createElement('div');
  welcomeMsg.className = 'message ai';
  welcomeMsg.innerHTML = `
    <div class="message-content">
      👋 Welcome to AI Assistant! I can help explain questions and provide information about the Australian Citizenship Test.
    </div>
    <span class="timestamp">${new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
  `;
  chatBox.appendChild(welcomeMsg);
  
  // Create chat input container
  const inputContainer = document.createElement('div');
  inputContainer.className = 'chat-input-container';
  
  // Create chat input row
  const inputRow = document.createElement('div');
  inputRow.id = 'chat-input-row';
  inputRow.className = 'chat-input-row';
  inputRow.style.display = 'flex';
  inputRow.style.width = '100%';
  
  // Create chat input
  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'chat-input';
  input.className = 'chat-input';
  input.placeholder = 'Ask me something...';
  input.style.flex = '1';
  input.style.padding = '12px 15px';
  input.style.borderRadius = '4px';
  input.style.boxSizing = 'border-box';
  inputRow.appendChild(input);
  
  // Add the paper plane icon button (no text)
  const paperPlaneButton = createPaperPlaneButton();
  inputRow.appendChild(paperPlaneButton);
  
  // Assemble the interface
  inputContainer.appendChild(inputRow);
  container.appendChild(header);
  container.appendChild(chatBox);
  container.appendChild(inputContainer);
  document.body.appendChild(container);
  
  // Create toggle button
  if (!document.getElementById('chat-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'chat-toggle';
    toggleBtn.innerHTML = '<i class="fas fa-robot"></i><span class="notification-badge">1</span>';
    toggleBtn.title = 'Chat with AI Assistant';
    toggleBtn.addEventListener('click', toggleChat);
    document.body.appendChild(toggleBtn);
  }
  
  // Add close button functionality
  const closeBtn = document.getElementById('chat-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      container.classList.add('hidden');
    });
  }
}

// Function to apply responsive styles based on screen width
function applyResponsiveStyles() {
  const chatToggle = document.getElementById('chat-toggle');
  const chatInputRow = document.getElementById('chat-input-row');
  const sendButton = document.getElementById('send-button');
  
  if (window.innerWidth <= 576) {
    // Mobile adjustments
    if (chatToggle) {
      // On very small screens, move to bottom left
      if (window.innerWidth <= 480) {
        chatToggle.style.left = '10px';
        chatToggle.style.right = 'auto';
        chatToggle.style.bottom = '100px'; // Moved higher on mobile screens
        chatToggle.style.width = '45px';
        chatToggle.style.height = '45px';
      } else {
        // On larger mobile screens
        chatToggle.style.left = '15px';
        chatToggle.style.right = 'auto';
        chatToggle.style.bottom = '100px'; // Moved higher on mobile screens
        chatToggle.style.width = '50px';
        chatToggle.style.height = '50px';
      }
    }
    
    // Ensure chat input row is positioned properly
    if (chatInputRow) {
      chatInputRow.style.position = 'relative';
      chatInputRow.style.zIndex = '10';
    }
  } else {
    // Desktop adjustments - reset inline styles
    if (chatToggle) {
      chatToggle.style.left = '';
      chatToggle.style.right = '';
      chatToggle.style.bottom = '';
      chatToggle.style.width = '';
      chatToggle.style.height = '';
    }
    
    // Reset send button styles
    if (sendButton) {
      sendButton.style.position = '';
      sendButton.style.zIndex = '';
    }
    
    // Reset chat input row styles
    if (chatInputRow) {
      chatInputRow.style.position = '';
      chatInputRow.style.zIndex = '';
    }
  }
}


  


