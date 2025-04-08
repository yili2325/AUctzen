// Declare global variables at the top
const chatBox = document.getElementById("chat-box");
let chatInput = document.getElementById("chat-input");
let sendButton = document.getElementById("send-button");
let chatContainer = document.getElementById("chat-container");

// Initialize - Add toggle button if it doesn't exist
function initChatInterface() {
  // Re-query elements to ensure they exist (in case DOM wasn't ready before)
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
  
  // Make send button more accessible on mobile
  if (window.innerWidth <= 576) {
    sendButton.style.position = 'relative';
    sendButton.style.zIndex = '20';
    
    // Add a higher z-index to the chat input row to ensure it's above other elements
    const chatInputRow = document.getElementById('chat-input-row');
    if (chatInputRow) {
      chatInputRow.style.position = 'relative';
      chatInputRow.style.zIndex = '10';
    }
    
    // Move toggle button to bottom left on mobile for better accessibility
    const toggleButton = document.getElementById('chat-toggle');
    if (toggleButton && window.innerWidth <= 480) {
      toggleButton.style.left = '10px';
      toggleButton.style.right = 'auto';
      toggleButton.style.bottom = '10px';
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

async function askAI() {
  const userQuestion = chatInput.value.trim();
  if (!userQuestion) return;

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

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
  initChatInterface();
  
  // Re-get references after DOM is fully loaded
  chatInput = document.getElementById("chat-input");
  sendButton = document.getElementById("send-button");
  
  // Add event listeners to the chat buttons
  if (sendButton) {
    sendButton.addEventListener("click", askAI);
  }
  
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") askAI();
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
        chatToggle.style.bottom = '10px';
        chatToggle.style.width = '45px';
        chatToggle.style.height = '45px';
      } else {
        // On larger mobile screens
        chatToggle.style.left = '15px';
        chatToggle.style.right = 'auto';
        chatToggle.style.bottom = '15px';
        chatToggle.style.width = '50px';
        chatToggle.style.height = '50px';
      }
    }
    
    // Ensure send button is accessible
    if (sendButton) {
      sendButton.style.position = 'relative';
      sendButton.style.zIndex = '20';
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


  


