// Constants
const QUESTIONS_PER_SET = 20;

// Global variables
let practiceCategory = '';
let isPracticeStarted = false;
let currentSet = [];
let currentQuestionIndex = 0;
let correctAnswers = 0;
let wrongAnswers = 0;
let timerInterval = null;
let startTime = null;
let timerDisplay = null;
let categoryFilter = 'All';
let loadingContainer;
let questionContainer;
let errorContainer;
let questionSet = [];
let score = 0;
let timeRemaining = 45 * 60; // 45 minutes in seconds
let setsCompleted = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Assign the DOM elements
    loadingContainer = document.getElementById('loading-container');
    questionContainer = document.getElementById('question-container');
    errorContainer = document.getElementById('error-container');
  
    // Optional: check if found
    console.log('loadingContainer:', loadingContainer);
    console.log('questionContainer:', questionContainer);
    console.log('errorContainer:', errorContainer);
  
    // Attach click listeners
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', startPractice);
    }
    console.log('✅ Containers initialized:', {
        loadingContainer,
        errorContainer,
        questionContainer
      });

  });
// Helper function to get readable category name
function getReadableCategoryName(category) {
    const categoryMap = {
        'all': 'All Categories',
        'australia-and-people': 'Australia and its People',
        'australia-and-its-people': 'Australia and its People',
        'democratic-beliefs': 'Democratic Beliefs',
        'government-law': 'Government and Law',
        'australian-values': 'Australian Values'
    };
    
    return categoryMap[category] || category.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Function to convert frontend category name to backend category name
function getBackendCategoryName(frontendCategory) {
    // If the category is already a backend format, return it
    if (frontendCategory === 'all') return 'all';
    
    // Map frontend categories to backend categories
    const categoryMap = {
        'australia-and-people': 'australia-and-its-people',
        'australia-and-its-people': 'australia-and-its-people',
        'democratic-beliefs': 'democratic-beliefs',
        'government-law': 'government-law',
        'australian-values': 'australian-values'
    };
    
    console.log('Converting frontend category to backend category:', frontendCategory, '->', categoryMap[frontendCategory] || frontendCategory);
    return categoryMap[frontendCategory] || frontendCategory;
}

// Function to show category
function showCategory(category) {
    console.log('Showing category:', category);
    
    if (!category) {
        console.error('Invalid category provided');
        return;
    }
    
    // Get all category cards
    const categoryCards = document.querySelectorAll('.category-card');
    console.log('Found category cards:', categoryCards.length);
    
    if (categoryCards.length === 0) {
        console.warn('No category cards found in DOM');
    }
    
    // Debug log the selected category
    console.log('Category being selected:', category);
    
    // Find the selected card
    const selectedCard = document.querySelector(`.category-card[data-category="${category}"]`);
    
    if (!selectedCard) {
        console.error(`Category card for "${category}" not found`);
        return;
    }

    // Check authentication
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    console.log('User logged in:', isLoggedIn);
    
    // If not logged in, redirect to login
    if (!isLoggedIn) {
        console.log('User not logged in, redirecting to login page');
        window.location.href = '/practice.html';
        return;
    }
    
    // Update active category in UI
    categoryCards.forEach(card => {
        card.classList.remove('active');
    });
    
    selectedCard.classList.add('active');
    console.log('Active category set to:', category);
    
    // Save category to localStorage - ensure we're saving the exact provided category
    localStorage.removeItem('selectedCategory'); // Clear existing first to avoid stale data
                    localStorage.setItem('selectedCategory', category);
    console.log('Saved to localStorage:', category);
    
    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.set('category', category);
    window.history.pushState({}, '', url);
    console.log('URL updated with category:', category);
    
    // Update category tag text if exists
    const categoryTag = document.querySelector('.category-tag span');
    if (categoryTag) {
        const readableName = getReadableCategoryName(category);
        categoryTag.textContent = readableName;
        console.log('Updated category tag to:', readableName);
    }
    
    // If practice already started, restart with new category
    if (isPracticeStarted) {
        console.log('Practice already started, restarting with new category');
        stopPractice();
        initializePractice();
    }
}

// Function to start practice
function startPractice() {
    console.log('Starting practice session...');
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    // If not logged in, redirect to auth page
    if (!isLoggedIn || !token) {
        console.log('User not logged in, redirecting to login page');
        window.location.href = '/practice.html';
        return;
    }

    // Get selected category - first try URL, then active card, then localStorage
    let category = 'all';
    
    // First check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('category')) {
        category = urlParams.get('category');
        console.log('Using category from URL parameter:', category);
    } 
    // Then check active category card
    else {
        const activeCategory = document.querySelector('.category-card.active');
        if (activeCategory) {
            category = activeCategory.getAttribute('data-category');
            console.log('Using category from active card:', category);
        } 
        // Finally, check localStorage as fallback
        else if (localStorage.getItem('selectedCategory')) {
            category = localStorage.getItem('selectedCategory');
            console.log('Using category from localStorage:', category);
        } else {
            console.log('No category found, defaulting to "all"');
        }
    }
    
    // Save the selected category to localStorage for consistency
    localStorage.setItem('selectedCategory', category);
    console.log('Selected category saved to localStorage:', category);
    
    // Update URL to reflect the category if not already set
    if (!urlParams.has('category') || urlParams.get('category') !== category) {
        const url = new URL(window.location);
        url.searchParams.set('category', category);
        window.history.replaceState({ category: category }, '', url);
        console.log('URL updated to reflect selected category:', url.toString());
    }
    
    // Hide category selection
    const categorySection = document.querySelector('.category-section');
    if (categorySection) {
        categorySection.style.display = 'none';
    } else {
        console.warn('Category section not found');
    }
    
    // Show practice container
    const practiceContainer = document.getElementById('practice-container');
    if (practiceContainer) {
        practiceContainer.style.display = 'block';
    } else {
        console.warn('Practice container not found');
    }
    
    // Set practice started flag
    isPracticeStarted = true;
    
    // Initialize practice session
    console.log('Initializing practice with category:', category);
    initializePractice();
}

// Check connection function
async function checkConnection() {
    try {
        const button = document.querySelector('.error-actions .btn-outline');
        if (button) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
            button.disabled = true;
        }

        // Try to connect to the questions endpoint with HEAD method to avoid loading data
        const response = await fetch('/api/questions', { 
            method: 'HEAD',
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.ok) {
            showToast(createToast('success', 'Connection successful! Try reloading the page.'));
            if (button) {
                button.innerHTML = '<i class="fas fa-check"></i> Connection OK';
                button.classList.add('connection-ok');
            }
        } else {
            showToast(createToast('error', `Server error: ${response.status}. Please try again later.`));
            if (button) {
                button.innerHTML = '<i class="fas fa-times"></i> Server Error';
                button.disabled = false;
            }
        }
    } catch (error) {
        console.error('Connection check failed:', error);
        showToast(createToast('error', 'Connection failed. Please check your internet connection.'));
        const button = document.querySelector('.error-actions .btn-outline');
        if (button) {
            button.innerHTML = '<i class="fas fa-wifi"></i> No Connection';
            button.classList.add('connection-error');
            button.disabled = false;
        }
    }
}

// Make functions global
window.showCategory = showCategory;
window.startPractice = startPractice;
window.checkConnection = checkConnection;

// Function to show explanation
function showExplanation(question) {
    const explanationContainer = document.getElementById('explanation-container');
    if (!explanationContainer) return;
    
    // Determine if answer was correct
    const isCorrect = question.selectedAnswer === question.correctAnswer;
    
    explanationContainer.innerHTML = `
        <div class="explanation-header ${isCorrect ? 'correct' : 'incorrect'}">
            <i class="fas fa-${isCorrect ? 'check-circle' : 'times-circle'}"></i>
            <span>${isCorrect ? 'Correct!' : 'Incorrect'}</span>
        </div>
        <div class="explanation-content">
            <h4>Explanation:</h4>
            <p>${question.explanation || 'The correct answer is: ' + question.options[question.correctAnswer]}</p>
        </div>
    `;
    
    explanationContainer.style.display = 'block';
    
    // Scroll to explanation
    explanationContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Play sound function
function playSound(type) {
    // Check if sounds are enabled in settings
    const soundsEnabled = localStorage.getItem('soundsEnabled') !== 'false';
    if (!soundsEnabled) return;
    
    // Create audio element if needed
    const audio = new Audio();
    
    if (type === 'correct') {
        audio.src = '/sounds/correct.mp3';
    } else if (type === 'incorrect') {
        audio.src = '/sounds/incorrect.mp3';
    } else if (type === 'complete') {
        audio.src = '/sounds/complete.mp3';
    }
    
    // Play sound
    audio.play().catch(err => console.log('Audio play failed:', err));
}

// Empty function - CSS moved to practice.css
function addExplanationStyles() {
    // CSS has been moved to practice.css
    console.log('Using external CSS from practice.css instead of inline styles');
}

// Finish practice and show results
function finishPractice(timeUp = false) {
    try {
        // Clear timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // Get result container and question container
        const questionContainer = document.getElementById('question-container');
        const practiceContainer = document.getElementById('practice-container');
        
        if (!practiceContainer) {
            console.error('Practice container not found');
            return;
        }
        
        // Calculate results
        const totalQuestions = questionSet.length;
        const correctAnswers = score;
        const unanswered = questionSet.filter(q => !q.answered).length;
        const percentageCorrect = Math.round((correctAnswers / totalQuestions) * 100);
        const isPassed = percentageCorrect >= 75; // Pass threshold is 75%
        
        // Format time taken
        const timeUsed = 45 * 60 - timeRemaining;
        const minutesUsed = Math.floor(timeUsed / 60);
        const secondsUsed = timeUsed % 60;
        const timeDisplay = `${minutesUsed}m ${secondsUsed}s`;
        
        // Create results HTML using results.css classes
        const resultsHTML = `
            <div class="results-container">
                <h2>${isPassed ? 'Congratulations!' : 'Practice Results'}</h2>
                <p>${isPassed ? 'You passed the practice test!' : 'Keep practicing to improve your score.'}</p>
                
                ${timeUp ? '<p class="time-display"><i class="fas fa-clock"></i> Time\'s up! Here are your results.</p>' : ''}
                
                <div class="stats-container">
                    <div class="stat-item">
                        <i class="fas fa-check-circle"></i>
                        <span>${correctAnswers}</span>
                        <label>Correct Answers</label>
                    </div>
                    
                    <div class="stat-item">
                        <i class="fas fa-times-circle"></i>
                        <span>${unanswered}</span>
                        <label>Unanswered</label>
                    </div>
                    
                    <div class="stat-item">
                        <i class="fas fa-percentage"></i>
                        <span>${percentageCorrect}%</span>
                        <label>Score</label>
            </div>
            </div>
                
                <div class="time-display">
                    <i class="fas fa-stopwatch"></i>
                    Time Taken: <strong>${timeDisplay}</strong>
                </div>
                
                <p class="sets-progress">
                    <strong>Status:</strong> 
                    <span class="${isPassed ? 'text-success' : 'text-danger'}">
                        ${isPassed ? 'PASSED' : 'PRACTICE MORE'}
                    </span>
                </p>
                
                <p>${isPassed ? 
                    'Great job! You\'ve demonstrated a good understanding of the Australian citizenship test material.' : 
                    'You need to score at least 75% to pass the official test. Keep practicing!'}
                </p>
                
                <button class="start-next-btn" onclick="window.location.href='/practice_main.html'">
                    <i class="fas fa-redo"></i> Practice Again
                </button>
                
                <a href="/dashboard.html" class="view-progress">
                    <i class="fas fa-home"></i> Back to Dashboard
                </a>
        </div>
    `;
    
        // Update practice container with results
        practiceContainer.innerHTML = resultsHTML;
        
        // Update user's practice statistics
        updatePracticeStats(isPassed, score, totalQuestions);
        
        console.log('Practice session completed:', {
            score,
            totalQuestions,
            percentageCorrect,
            passed: isPassed,
            timeTaken: timeDisplay
        });
    } catch (error) {
        console.error('Error finishing practice:', error);
        showError('Failed to display results. Please try again.');
    }
}

// Function to update user's practice statistics
function updatePracticeStats(passed, score, totalQuestions) {
    try {
        // Get existing stats
        const statsKey = 'practiceStats';
        let stats = JSON.parse(localStorage.getItem(statsKey)) || {
            total: 0,
            passed: 0,
            failed: 0,
            averageScore: 0,
            bestScore: 0,
            lastCompletedAt: null
        };
        
        // Update stats
        stats.total += 1;
        if (passed) {
            stats.passed += 1;
            } else {
            stats.failed += 1;
        }
        
        // Calculate percentage score
        const percentageScore = Math.round((score / totalQuestions) * 100);
        
        // Update average score
        const totalScores = stats.averageScore * (stats.total - 1);
        stats.averageScore = Math.round((totalScores + percentageScore) / stats.total);
        
        // Update best score if current is better
        if (percentageScore > stats.bestScore) {
            stats.bestScore = percentageScore;
        }
        
        // Update last completed timestamp
        stats.lastCompletedAt = new Date().toISOString();
        
        // Save updated stats
        localStorage.setItem(statsKey, JSON.stringify(stats));
        
        // Save test result for dashboard display
        const userId = getUserId();
        const testResultsKey = `testResults_${userId}`;
        const testResults = JSON.parse(localStorage.getItem(testResultsKey)) || [];
        
        // Get the actual selected category from localStorage
        // This is more reliable than reading from the UI which might display a different category
        const selectedCategory = localStorage.getItem('selectedCategory') || 'all';
        
        // Get UI category for display purposes
        const categoryTag = document.querySelector('.category-tag span');
        const displayCategory = categoryTag ? categoryTag.textContent : getReadableCategoryName(selectedCategory);
        
        // Calculate time taken
        const timeUsed = 45 * 60 - timeRemaining;
        
        // Create test result entry
        const testResult = {
            date: new Date().toISOString(),
            correctAnswers: score,
            totalQuestions: totalQuestions,
            category: displayCategory,
            selectedCategory: selectedCategory, // Add the actual selected category
            duration: Math.round(timeUsed / 60), // in minutes
            passed: passed,
            // Add category-specific data for dashboard display
            categoryResults: {
                [selectedCategory]: {
                    correct: score,
                    total: totalQuestions,
                    percentage: percentageScore
                }
            }
        };
        
        // Add to test results
        testResults.push(testResult);
        
        // Save back to localStorage
        localStorage.setItem(testResultsKey, JSON.stringify(testResults));
        
        console.log('Updated practice statistics:', stats);
        console.log('Saved test result for dashboard:', testResult);
        
        // If we're on the dashboard, trigger update
        if (window.updateDashboard && typeof window.updateDashboard === 'function') {
            console.log('Dashboard detected, triggering real-time update');
            window.updateDashboard();
        }
        
        // Trigger a storage event so the dashboard can update if open in another tab
        if (window.localStorage) {
            const storageUpdateEvent = new StorageEvent('storage', {
                key: testResultsKey,
                newValue: JSON.stringify(testResults),
                url: window.location.href
            });
            window.dispatchEvent(storageUpdateEvent);
        }
    } catch (error) {
        console.error('Error updating practice statistics:', error);
        // Don't throw, just log error
    }
}

// Timer functionality
function startTimer() {
    console.log('Starting timer...');
    
    // Clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Reset the time remaining
    timeRemaining = 45 * 60; // 45 minutes in seconds
    
    // Find timer display element
    timerDisplay = document.querySelector('.timer-display');
    if (!timerDisplay) {
        console.error('Timer display element not found');
        return;
    }
    
    console.log('Timer display element found, starting countdown');
    
    // Update display immediately
    updateTimerDisplay();
    
    // Set up the interval for updating the timer
    timerInterval = setInterval(() => {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
            // Handle time up event
            finishPractice(true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    if (!timerDisplay) {
        timerDisplay = document.querySelector('.timer-display');
        if (!timerDisplay) {
            console.error('Timer display element not found in updateTimerDisplay');
            return;
        }
    }

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const displayText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerDisplay.textContent = displayText;
    console.log('Updated timer display:', displayText);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Make startNextSet available globally
window.startNextSet = function() {
    currentSet++;
    setsCompleted++;
    initializePractice();
};

async function fetchQuestions(category) {
  try {
    console.log('Fetching questions for category:', category);
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token found');
      throw new Error('No authentication token found');
    }
    
    console.log('Token found, length:', token.length);
    
    // Get category name for backend
    const backendCategory = getBackendCategoryName(category);
    console.log('Using backend category:', backendCategory);
    
    // Get seen question IDs to exclude
    const seenIds = getSeenQuestionIds();
    console.log('Excluding seen question IDs count:', seenIds.length);
    
    // Prepare params
    const params = new URLSearchParams();
    if (backendCategory && backendCategory !== 'all') {
      params.append('category', backendCategory);
    }
    
    // Add seen question IDs as comma-separated list if any exist
    if (seenIds.length > 0) {
      params.append('exclude', seenIds.join(','));
    }
    
    // Set limit to QUESTIONS_PER_SET
    params.append('limit', QUESTIONS_PER_SET.toString());
    
    const url = `/api/questions/practice${params.toString() ? '?' + params.toString() : ''}`;
    console.log('Fetching questions from URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch questions: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Successfully fetched questions count:', data.questions?.length || 0);
    
    // Check subscription type - if basic, warn that category filtering might be ignored
    if (data.subscription === 'basic' && backendCategory !== 'all') {
      console.warn('Basic subscription detected - the server may ignore category filtering. You might see questions from all categories.');
      // Store the originally requested category anyway, for dashboard tracking
      localStorage.setItem('actualSelectedCategory', category);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching questions:', error);
    // Return empty questions array as fallback
    return { questions: [] };
  }
}
  
// Function to get array of seen question IDs
function getSeenQuestionIds() {
    try {
        // Get user-specific data
        const userId = getUserId();
        const key = `seenQuestions_${userId}`;
        const seenQuestions = JSON.parse(localStorage.getItem(key)) || [];
        
        // If we have a lot of seen questions, only exclude the most recent ones
        // to ensure we don't run out of questions (keep last 100)
        if (seenQuestions.length > 100) {
            return seenQuestions.slice(-100);
        }
        
        return seenQuestions;
    } catch (e) {
        console.error('Error getting seen question IDs:', e);
        return []; // Return empty array if none found or error occurs
    }
}

// Function to save seen question IDs
function saveSeenQuestions(questionIds) {
    try {
        // Get user-specific data
        const userId = getUserId();
        const key = `seenQuestions_${userId}`;
        
        // Get existing seen questions
        const existingQuestions = JSON.parse(localStorage.getItem(key)) || [];
        
        // Add new question IDs
        const allQuestions = [...existingQuestions, ...questionIds];
        
        // Remove duplicates if any
        const uniqueQuestions = [...new Set(allQuestions)];
        
        // Limit to last 100 to ensure we don't exclude too many questions
        const limitedQuestions = uniqueQuestions.slice(-100);
        
        // Save back to localStorage
        localStorage.setItem(key, JSON.stringify(limitedQuestions));
        
        console.log(`Saved ${questionIds.length} new question IDs, total seen: ${limitedQuestions.length}`);
        return limitedQuestions;
    } catch (e) {
        console.error('Error saving seen question IDs:', e);
        return [];
    }
}

// Helper function to get current user ID
function getUserId() {
    try {
        if (typeof getCurrentUser === 'function') {
            const userData = getCurrentUser();
            return userData?.id || userData?.userId || 'guest';
        } else {
            const userData = JSON.parse(localStorage.getItem('user')) || {};
            return userData.id || userData.userId || 'guest';
        }
    } catch (e) {
        console.error('Error getting current user ID:', e);
        return 'guest';
    }
}

// Function to clear seen questions for the current user
function clearSeenQuestions() {
    try {
        const userId = getUserId();
        const key = `seenQuestions_${userId}`;
        localStorage.removeItem(key);
        
        // Also clear category-specific seen questions
        const categories = ['all', 'australia-and-its-people', 'democratic-beliefs', 
                            'government-law', 'australian-values'];
        
        categories.forEach(category => {
            const categoryKey = `categorySeenQuestions_${userId}_${category}`;
            localStorage.removeItem(categoryKey);
            console.log(`Cleared seen questions for category: ${category}`);
        });
        
        console.log('Cleared all seen questions for user');
    } catch (e) {
        console.error('Error clearing seen questions:', e);
    }
}

// Initialize questions for the current set
async function initializePractice() {
    console.log('Initializing practice session...');
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const token = localStorage.getItem('token');
    
    // Redirect to registration form if not logged in
    if (!isLoggedIn || !token) {
        window.location.href = '/practice.html';
        return;
    }
    
    // Always clear seen questions to get fresh content each time
    clearSeenQuestions();
    console.log('Cleared seen questions to get fresh content');
    
    // Show loading container and hide question container
    if (loadingContainer) loadingContainer.style.display = 'flex';
    if (questionContainer) questionContainer.style.display = 'none';
    if (errorContainer) errorContainer.style.display = 'none';
    
    try {
        // Determine category filter
        let categoryToUse;
        
        // Try to get category from URL first
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('category')) {
            categoryToUse = urlParams.get('category');
            console.log('Using category from URL:', categoryToUse);
        } 
        // Then from local storage
        else if (localStorage.getItem('selectedCategory')) {
            categoryToUse = localStorage.getItem('selectedCategory');
            console.log('Using category from localStorage:', categoryToUse);
        } 
        // Default to 'all'
        else {
            categoryToUse = 'all';
            console.log('No category found, defaulting to "all"');
        }
        
        console.log(`Using category for practice: ${categoryToUse}`);
        
        // Update the category UI to match selected category
        updateCategoryUI(categoryToUse);
        
        try {
            // Use local questions function instead of API
            console.log('Fetching questions with category:', categoryToUse);
            const data = await fetchLocalQuestionsForPractice(categoryToUse);
            
            if (data && data.questions && data.questions.length > 0) {
                // Process the questions and start practice
                processQuestions(data.questions);
                return; // Success, we're done
            } else {
                throw new Error('No questions found for this category');
            }
        } catch (apiError) {
            console.error('Error fetching questions:', apiError);
            showErrorState({
                message: 'Failed to load questions. Please try again.'
            });
            return;
        }
    } catch (error) {
        console.error('Error in initializePractice:', error);
        
        // Show error state in UI
        showErrorState(error);
    }
}

// Function to update the category UI based on selected category
function updateCategoryUI(selectedCategory) {
    try {
        console.log('Updating category UI for:', selectedCategory);
        
        // Find all category cards
        const categoryCards = document.querySelectorAll('.category-card');
        if (!categoryCards || categoryCards.length === 0) {
            console.log('No category cards found in the UI');
            return;
        }
        
        // Remove active class from all cards
        categoryCards.forEach(card => card.classList.remove('active'));
        
        // If no category is selected, mark "All Categories" as active
        if (!selectedCategory) {
            const allCategoriesCard = document.querySelector('.category-card[data-category="all"]');
            if (allCategoriesCard) {
                allCategoriesCard.classList.add('active');
            }
            
            // Update category tag if it exists
            const categoryTag = document.querySelector('.category-tag span');
            if (categoryTag) {
                categoryTag.textContent = 'All Categories';
            }
            return;
        }
        
        // Find and mark the selected category card as active
        const selectedCard = document.querySelector(`.category-card[data-category="${selectedCategory}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
            console.log('Activated category card for:', selectedCategory);
            
            // Update category tag in the UI if it exists
            const categoryTag = document.querySelector('.category-tag span');
            if (categoryTag) {
                // Get readable category name
                const readableCategory = getReadableCategoryName(selectedCategory);
                categoryTag.textContent = readableCategory;
                console.log('Updated category tag display to:', readableCategory);
            }
        } else {
            console.warn(`Category card for "${selectedCategory}" not found`);
            
            // Fallback to "All Categories" if the specified category doesn't exist
                const allCategoriesCard = document.querySelector('.category-card[data-category="all"]');
                if (allCategoriesCard) {
                    allCategoriesCard.classList.add('active');
                console.log('Falling back to "All Categories"');
                
                // Update category tag if it exists
                const categoryTag = document.querySelector('.category-tag span');
                if (categoryTag) {
                    categoryTag.textContent = 'All Categories';
                }
            }
        }
    } catch (error) {
        console.error('Error updating category UI:', error);
    }
}

function showErrorState(error) {
    const container = document.querySelector('.practice-container');
    if (container) {
        const errorMessage = error.message || 'An unexpected error occurred';
        let actionText = '';
        
        if (errorMessage.includes('Failed to load questions') || errorMessage.includes('No questions found')) {
            actionText = `
                <p>This could be due to one of the following reasons:</p>
                <ul>
                    <li>The questions data file might not be accessible</li>
                    <li>The selected category might not exist in the data</li>
                    <li>Your browser cache might need to be cleared</li>
                </ul>
            `;
        }
        
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <h3>Failed to load questions</h3>
                <p>${errorMessage}</p>
                ${actionText}
                <div class="error-actions">
                    <button onclick="window.location.reload()" class="btn-primary">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                    <button onclick="localStorage.removeItem('selectedCategory'); window.location.href='/practice_main.html'" class="btn-outline">
                        <i class="fas fa-sync-alt"></i> Reset Categories
                    </button>
                    <a href="/dashboard.html" class="btn-secondary">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </a>
                </div>
            </div>
        `;

        // CSS has been moved to practice.css
        console.log('Using external CSS from practice.css for error state');
    }
}

// Helper functions for showing messages
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    showToast(toast);
}

function showToast(toast) {
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 100);
}

function handlePackageSelection(packageType) {
    switch (packageType) {
        case 'basic':
            // For basic package, just close the modal
            upgradeModal.style.display = 'none';
            break;
        case 'premium':
            // For premium package, redirect to the practice page (not payment)
            window.location.href = '/practice_main.html';
            break;
        case 'lifetime':
            // For lifetime package, redirect to payment page with lifetime plan
            window.location.href = '/payment.html?plan=lifetime';
            break;
        default:
            console.error('Invalid package type');
    }
}

// Create a toast notification
function createToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'success') icon = 'check-circle';
    
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    return toast;
}

// Update processQuestions to track seen questions and filter by category
function processQuestions(questions) {
    console.log(`Processing ${questions.length} questions`);
    
    // Debug - log first question to see its structure
    if (questions.length > 0) {
        console.log('Sample question structure:', questions[0]);
    }
    
    // Get selected category
    const selectedCategory = localStorage.getItem('selectedCategory') || 'all';
    console.log('Selected category for filtering:', selectedCategory);
    
    // Filter by category if not 'all'
    let filteredQuestions = questions;
    if (selectedCategory !== 'all') {
        // Get backend category name for filtering
        const backendCategoryName = getBackendCategoryName(selectedCategory);
        console.log('Filtering by backend category:', backendCategoryName);
        
        // Filter questions by category
        filteredQuestions = questions.filter(q => {
            // Create normalized versions for comparison
            const normalizedCategory = q.category.toLowerCase().replace(/['''`]/g, "'");
            const normalizedTarget = backendCategoryName.toLowerCase().replace(/['''`]/g, "'");
            return normalizedCategory.includes(normalizedTarget) || normalizedTarget.includes(normalizedCategory);
        });
        
        console.log(`Found ${filteredQuestions.length} questions for category "${backendCategoryName}"`);
        
        // If we don't have enough questions after filtering, add some from other categories
        if (filteredQuestions.length < 10 && questions.length > 0) {
            console.log(`Not enough questions for category (${filteredQuestions.length}), adding some from other categories`);
            
            // Get questions from other categories
            const otherQuestions = questions.filter(q => !filteredQuestions.includes(q))
                .sort(() => 0.5 - Math.random()) // Shuffle
                .slice(0, QUESTIONS_PER_SET - filteredQuestions.length);
            
            // Add them to our filtered questions
            filteredQuestions = [...filteredQuestions, ...otherQuestions];
            console.log(`Added ${otherQuestions.length} questions from other categories, total: ${filteredQuestions.length}`);
        }
    }
    
    // Filter out invalid questions
    const validQuestions = filteredQuestions.filter(q => 
        q && 
        q._id && 
        (q.question || q.text) && // Support both field names
        Array.isArray(q.options) && 
        q.options.length > 0 && 
        typeof q.correctAnswer === 'number' && 
        q.correctAnswer >= 0 && 
        q.correctAnswer < q.options.length
    );
    
    console.log(`Valid questions after filtering: ${validQuestions.length}`);
    
    if (validQuestions.length === 0) {
        showError('No valid questions found for this category. Please try another category.');
        
        // Hide loading container and show error container
        if (loadingContainer) loadingContainer.style.display = 'none';
        if (errorContainer) {
            errorContainer.style.display = 'block';
            const errorText = errorContainer.querySelector('#error-text');
            if (errorText) {
                errorText.textContent = 'No valid questions found for this category. Please try another category.';
            }
        }
        return;
    }
    
    // Limit to QUESTIONS_PER_SET (20) questions per set
    const limitedQuestions = validQuestions.length > QUESTIONS_PER_SET 
        ? validQuestions.slice(0, QUESTIONS_PER_SET) 
        : validQuestions;
    
    console.log(`Using ${limitedQuestions.length} questions for this set (limit: ${QUESTIONS_PER_SET})`);
    
    // Save these question IDs as seen
    const questionIds = limitedQuestions.map(q => q._id);
    saveSeenQuestions(questionIds);
    
    // Map questions and add status properties
    questionSet = limitedQuestions.map(q => ({
        ...q,
        // Ensure consistent field names 
        question: q.question || q.text,
        text: q.text || q.question,
        answered: false,
        selectedAnswer: null
    }));
    
    // Reset practice session
    score = 0;
    currentQuestionIndex = 0;
    timeRemaining = 45 * 60; // 45 minutes in seconds
    
    // Set up practice interface - make sure the containers exist
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (questionContainer) questionContainer.style.display = 'block';
    if (errorContainer) errorContainer.style.display = 'none';
    
    // Add styles for the containers if they're missing
    addContainerStyles();
    
    // Start timer and display first question
    updateProgressDisplay();
    startTimer();
    displayCurrentQuestion();
}

// Empty function - CSS moved to practice.css
function addContainerStyles() {
    // CSS has been moved to practice.css
    console.log('Using external CSS from practice.css instead of inline styles');
}

// Function to stop the current practice session
function stopPractice() {
    console.log('Stopping current practice session');
    
    // Clear timer if active
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Reset practice variables
    isPracticeStarted = false;
    questionSet = [];
    currentQuestionIndex = 0;
    score = 0;
}

// Function to convert backend category name to frontend category id
function getFrontendCategoryId(backendCategory) {
    // Map backend categories to frontend category IDs
    const categoryMap = {
        'all': 'all',
        'Australia and its People': 'australia-and-its-people',
        'Australian Values': 'australian-values', 
        'Government and the Law in Australia': 'government-law',
        'Australia\'s Democratic Beliefs, Rights and Liberties': 'democratic-beliefs'
    };
    
    console.log('Converting backend category to frontend ID:', backendCategory, '->', categoryMap[backendCategory] || backendCategory);
    return categoryMap[backendCategory] || backendCategory;
}

// Function to update progress display (question count and progress bar)
function updateProgressDisplay() {
    try {
        if (!questionSet || questionSet.length === 0) {
            console.warn('Cannot update progress display - no question set available');
            return;
        }
        
        // Set the constants for total questions
        const QUESTIONS_PER_SET = 20; // Always display 20 questions in UI
        
        // Get the display elements
        const currentQuestionEl = document.getElementById('current-question');
        const totalQuestionsEl = document.getElementById('total-questions');
        const progressFill = document.getElementById('progress-fill');
        
        // Update the text displays
        if (currentQuestionEl) {
            currentQuestionEl.textContent = (currentQuestionIndex + 1);
        }
        
        if (totalQuestionsEl) {
            // Always show 20 as the total number of questions in the UI
            totalQuestionsEl.textContent = QUESTIONS_PER_SET;
        }
        
        // Update the progress bar
        if (progressFill) {
            // Calculate progress percentage (current index + 1) / total questions
            const progress = ((currentQuestionIndex + 1) / QUESTIONS_PER_SET) * 100;
            progressFill.style.width = `${progress}%`;
        }
        
        console.log(`Updated progress display: Question ${currentQuestionIndex + 1} of ${QUESTIONS_PER_SET}`);
    } catch (error) {
        console.error('Error updating progress display:', error);
    }
}

// Function to display the current question
function displayCurrentQuestion() {
    try {
        if (!questionSet || questionSet.length === 0 || currentQuestionIndex >= questionSet.length) {
            console.error('Invalid question set or index:', {
                questionSetLength: questionSet?.length,
                currentQuestionIndex
            });
            return;
        }
        
        const question = questionSet[currentQuestionIndex];
        console.log('Current question data:', question); // Debug log
        
        const questionText = document.getElementById('question-text');
        const optionsContainer = document.getElementById('options-container');
        const nextBtn = document.getElementById('next-btn');
        const finishBtn = document.getElementById('finish-btn');
        const categoryTag = document.querySelector('.category-tag span');
        
        // Update question text - support both "text" and "question" field names
        if (questionText) {
            questionText.textContent = question.question || question.text || "Question text not available";
        }
        
        // Update category tag to show the actual category of this question
        if (categoryTag && question.category) {
            const frontendId = getFrontendCategoryId(question.category);
            const readableCategory = getReadableCategoryName(frontendId);
            categoryTag.textContent = readableCategory;
        }
        
        // Clear and populate options
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            
            // Add options
            question.options.forEach((option, index) => {
                const optionElement = document.createElement('div');
                optionElement.className = 'option';
                optionElement.setAttribute('data-index', index);
                
                // If question has been answered, add appropriate classes
                if (question.answered) {
                    if (index === question.correctAnswer) {
                        optionElement.classList.add('correct');
                    }
                    if (question.selectedAnswer === index && index !== question.correctAnswer) {
                        optionElement.classList.add('incorrect');
                    }
                }
                
                // Create option content with letter and text
                optionElement.innerHTML = `
                    <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                    <span class="option-text">${option}</span>
                `;
                
                // Add click handler only if question is not answered
                if (!question.answered) {
                    optionElement.addEventListener('click', () => selectAnswer(index));
                } else {
                    // Make options non-clickable when already answered
                    optionElement.style.cursor = 'default';
                }
                
                optionsContainer.appendChild(optionElement);
            });
            
            // If the question has been answered, show explanation if available
            if (question.answered && question.explanation) {
                const explanationElement = document.createElement('div');
                explanationElement.className = 'explanation';
                explanationElement.innerHTML = `
                    <div class="explanation-header">
                        <i class="fas fa-info-circle"></i>
                        <span>Explanation</span>
                    </div>
                    <div class="explanation-content">
                        ${question.explanation}
                    </div>
                `;
                optionsContainer.appendChild(explanationElement);
            }
            
            // Show next/finish buttons based on question state
            if (question.answered) {
                if (currentQuestionIndex === questionSet.length - 1) {
                    // This is the last question, show finish button
                    if (finishBtn) finishBtn.style.display = 'block';
                    if (nextBtn) nextBtn.style.display = 'none';
                } else {
                    // Not the last question, show next button
                    if (nextBtn) nextBtn.style.display = 'block';
                    if (finishBtn) finishBtn.style.display = 'none';
                }
            } else {
                // Question not answered, hide both buttons
                if (nextBtn) nextBtn.style.display = 'none';
                if (finishBtn) finishBtn.style.display = 'none';
            }
        }
        
        // Update progress display
        updateProgressDisplay();
        
        console.log(`Displayed question ${currentQuestionIndex + 1} of ${questionSet.length}`);
    } catch (error) {
        console.error('Error displaying current question:', error);
        showError('Failed to display question. Please try again.');
    }
}

// Function to handle answer selection
function selectAnswer(index) {
    try {
        // Get current question
        const question = questionSet[currentQuestionIndex];
        
        // If question is already answered, do nothing
        if (question.answered) {
            console.log('Question already answered, ignoring selection');
            return;
        }
        
        // Mark question as answered and store selected answer
        question.answered = true;
        question.selectedAnswer = index;
        
        // Update score and highlight correct/incorrect
        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) {
            // Find the selected and correct options
            const options = optionsContainer.querySelectorAll('.option');
            const selectedOption = optionsContainer.querySelector(`.option[data-index="${index}"]`);
            const correctOption = optionsContainer.querySelector(`.option[data-index="${question.correctAnswer}"]`);
            
            // Update UI for correct/incorrect
            if (index === question.correctAnswer) {
                selectedOption.classList.add('correct');
                score++;
                console.log('Correct answer! Score:', score);
            } else {
                selectedOption.classList.add('incorrect');
                correctOption.classList.add('correct');
                console.log('Incorrect answer. Correct was:', question.correctAnswer);
            }
            
            // Make all options non-clickable
            options.forEach(option => {
                option.style.cursor = 'default';
                // Remove click event listeners by cloning and replacing
                const newOption = option.cloneNode(true);
                option.parentNode.replaceChild(newOption, option);
            });
            
            // Add explanation if available
            if (question.explanation) {
                const explanationElement = document.createElement('div');
                explanationElement.className = 'explanation';
                explanationElement.innerHTML = `
                    <div class="explanation-header">
                        <i class="fas fa-info-circle"></i>
                        <span>Explanation</span>
                    </div>
                    <div class="explanation-content">
                        ${question.explanation}
                    </div>
                `;
                optionsContainer.appendChild(explanationElement);
            }
            
            // Show appropriate navigation buttons
            const nextBtn = document.getElementById('next-btn');
            const finishBtn = document.getElementById('finish-btn');
            
            if (currentQuestionIndex === questionSet.length - 1) {
                // Last question, show finish button
                if (finishBtn) {
                    finishBtn.style.display = 'block';
                    finishBtn.addEventListener('click', () => finishPractice(false));
                }
            } else {
                // Not last question, show next button
                if (nextBtn) {
                    nextBtn.style.display = 'block';
                    nextBtn.addEventListener('click', nextQuestion);
                }
            }
            
            // Update progress display
            updateProgressDisplay();
        }
    } catch (error) {
        console.error('Error selecting answer:', error);
        showError('Failed to process answer. Please try again.');
    }
}

// Function to move to the next question
function nextQuestion() {
    // Move to next question if not at the end
    if (currentQuestionIndex < questionSet.length - 1) {
        currentQuestionIndex++;
        updateProgressDisplay();
        displayCurrentQuestion();
    } else {
        // If at the end, finish practice
        finishPractice(false);
    }
}