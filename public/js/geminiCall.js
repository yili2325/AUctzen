const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("chat-send");
const chatContainer = document.getElementById("chat-container");

// Initialize - Add toggle button if it doesn't exist
function initChatInterface() {
  // If chat toggle doesn't exist, create it
  if (!document.getElementById('chat-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'chat-toggle';
    toggleBtn.innerHTML = '<i class="fas fa-comment-dots"></i><span class="notification-badge">1</span>';
    toggleBtn.title = 'Chat with AI Assistant';
    toggleBtn.addEventListener('click', toggleChat);
    document.body.appendChild(toggleBtn);
  }
  
  // Initially hide the chat
  chatContainer.classList.add('hidden');

  // Clear any existing messages
  if (chatBox) {
    chatBox.innerHTML = '';
  }
  
  // Add close button functionality
  const closeBtn = document.getElementById('chat-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      chatContainer.classList.add('hidden');
    });
  }
}

// Toggle chat visibility
function toggleChat() {
  const isFirstOpen = chatContainer.classList.contains('hidden') && chatBox.childElementCount === 0;
  chatContainer.classList.toggle('hidden');
  
  // First time opening - show welcome message
  if (isFirstOpen) {
    addSystemMessage("👋 Welcome to AI Assistant! I can help explain questions and provide information about the Australian Citizenship Test.");
    addSystemMessage("Select a question and ask me anything about it!");
    
    // Show an example of what users can ask
    setTimeout(() => {
      addSystemMessage("Try asking: \"Why is this answer correct?\" or \"Tell me more about this topic.\"");
    }, 1000);
  }
  
  // Focus on input when showing chat
  if (!chatContainer.classList.contains('hidden')) {
    // Remove notification badge when chat is opened
    const badge = document.querySelector('#chat-toggle .notification-badge');
    if (badge) badge.style.display = 'none';
    
    chatInput.focus();
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

sendButton.addEventListener("click", askAI);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") askAI();
});

// Initialize the chat interface
document.addEventListener('DOMContentLoaded', () => {
  initChatInterface();
  
  // Show notification when new questions are loaded
  const startPracticeBtn = document.querySelector('.start-practice-btn');
  if (startPracticeBtn) {
    startPracticeBtn.addEventListener('click', () => {
      setTimeout(showNewFeatureNotification, 2000); // Show notification after 2 seconds when practice starts
    });
  }
});


  


