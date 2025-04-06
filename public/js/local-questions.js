// Local questions handler
// This file provides functions to fetch and process questions from a local JSON file
// instead of relying on server API calls

// Cache for the questions data
let questionsCache = null;

// Get all questions from the local JSON file
async function fetchAllQuestions() {
  if (questionsCache) {
    return questionsCache;
  }
  
  try {
    console.log('Fetching questions from JSON file...');
    const response = await fetch('/data/all_questions.json');
    if (!response.ok) {
      console.error(`Failed to fetch JSON: status ${response.status}`);
      throw new Error(`Failed to load questions: ${response.status}`);
    }
    
    const rawData = await response.json();
    console.log('Successfully loaded questions data:', rawData.length, 'total questions');
    
    // Remove duplicate questions
    const uniqueQuestionMap = new Map();
    rawData.forEach(q => {
      // Use question text as a unique identifier
      if (!uniqueQuestionMap.has(q.question)) {
        uniqueQuestionMap.set(q.question, q);
      }
    });
    
    const data = Array.from(uniqueQuestionMap.values());
    console.log(`Removed ${rawData.length - data.length} duplicate questions, ${data.length} unique questions remain`);
    
    // Count questions by category
    const categories = {};
    data.forEach(q => {
      const category = q.category.toLowerCase();
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category]++;
    });
    console.log('Questions by category:', categories);
    
    questionsCache = data;
    return data;
  } catch (error) {
    console.error('Error loading local questions:', error);
    throw error;
  }
}

// Get questions for a specific category
async function getQuestionsByCategory(categoryId) {
  try {
    console.log('Getting questions for category:', categoryId);
    const allQuestions = await fetchAllQuestions();
    
    if (categoryId === 'all') {
      console.log(`Returning all ${allQuestions.length} questions`);
      return shuffleArray(allQuestions);
    }
    
    // Convert categoryId to match JSON format
    const normalizedCategoryId = normalizeCategoryId(categoryId);
    console.log('Normalized category ID:', normalizedCategoryId);
    
    // Filter questions by category
    const categoryQuestions = allQuestions.filter(q => {
      const questionCategory = q.category.toLowerCase();
      return questionCategory.includes(normalizedCategoryId) || normalizedCategoryId.includes(questionCategory);
    });
    
    console.log(`Found ${categoryQuestions.length} questions for category "${categoryId}"`);
    
    if (categoryQuestions.length === 0) {
      console.warn('No questions found for this category. Available categories:');
      const uniqueCategories = [...new Set(allQuestions.map(q => q.category))];
      console.log(uniqueCategories);
    }
    
    return categoryQuestions;
  } catch (error) {
    console.error('Error getting questions by category:', error);
    return [];
  }
}

// Normalize category IDs to match between UI and JSON
function normalizeCategoryId(categoryId) {
  console.log('Normalizing category ID:', categoryId);
  
  const categoryMap = {
    'all': 'all',
    'australia-and-people': 'australia and its people',
    'australia-and-its-people': 'australia and its people',
    'democratic-beliefs': 'democratic beliefs',
    'government-law': 'government and the law',
    'australian-values': 'australian values'
  };
  
  const normalized = categoryMap[categoryId] || categoryId;
  console.log('Mapped category:', categoryId, '->', normalized);
  return normalized.toLowerCase();
}

// Helper function to shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Function to get category-specific seen questions from localStorage
function getCategorySeenQuestions(categoryId) {
  try {
    const userId = typeof getUserId === 'function' ? getUserId() : 'guest';
    const key = `categorySeenQuestions_${userId}_${categoryId}`;
    
    const seenQuestions = JSON.parse(localStorage.getItem(key)) || [];
    console.log(`Retrieved ${seenQuestions.length} seen questions for category ${categoryId}`);
    
    return seenQuestions;
  } catch (error) {
    console.error('Error retrieving category seen questions:', error);
    return [];
  }
}

// Function to save category-specific seen questions to localStorage
function saveCategorySeenQuestions(categoryId, questionIds) {
  try {
    const userId = typeof getUserId === 'function' ? getUserId() : 'guest';
    const key = `categorySeenQuestions_${userId}_${categoryId}`;
    
    // Get existing seen questions for this category
    const existingIds = getCategorySeenQuestions(categoryId);
    
    // Add new question IDs
    const updatedIds = [...existingIds, ...questionIds];
    
    // Remove duplicates
    const uniqueIds = [...new Set(updatedIds)];
    
    // Save back to localStorage
    localStorage.setItem(key, JSON.stringify(uniqueIds));
    
    console.log(`Saved ${questionIds.length} new question IDs for category ${categoryId}, total seen: ${uniqueIds.length}`);
    
    return uniqueIds;
  } catch (error) {
    console.error('Error saving category seen questions:', error);
    return [];
  }
}

// Function to reset category-specific seen questions when all have been seen
function resetCategorySeenQuestionsIfNeeded(categoryId, totalQuestions) {
  try {
    const seenQuestions = getCategorySeenQuestions(categoryId);
    
    // If we've seen all or almost all questions in this category (allowing for small margin)
    if (seenQuestions.length >= totalQuestions * 0.9) {
      const userId = typeof getUserId === 'function' ? getUserId() : 'guest';
      const key = `categorySeenQuestions_${userId}_${categoryId}`;
      
      console.log(`Resetting seen questions for category ${categoryId} - all questions have been seen`);
      localStorage.removeItem(key);
      
      // Show a toast notification if the function exists
      if (typeof createToast === 'function' && typeof showToast === 'function') {
        const toast = createToast('info', `You've seen all questions in this category! Starting fresh set.`);
        showToast(toast);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if category seen questions need reset:', error);
    return false;
  }
}

// Get a limited set of questions, avoiding recently seen questions if possible
async function getPracticeQuestions(categoryId, limit = 20, seenQuestionIds = []) {
  try {
    // Get questions for the selected category
    const questions = await getQuestionsByCategory(categoryId);
    console.log(`Found ${questions.length} total questions for category: ${categoryId}`);
    
    if (!questions || questions.length === 0) {
      console.error('No questions found for category:', categoryId);
      // Try all questions as fallback if not already trying 'all'
      if (categoryId !== 'all') {
        console.log('Trying to fetch all questions instead');
        return getPracticeQuestions('all', limit, seenQuestionIds);
      }
      return [];
    }
    
    // Step 1: Remove duplicate questions with the same text
    const questionMap = new Map();
    questions.forEach(q => {
      // Use the question text as a key to detect duplicates
      if (!questionMap.has(q.question)) {
        questionMap.set(q.question, q);
      }
    });
    
    const uniqueQuestions = Array.from(questionMap.values());
    console.log(`After removing duplicates: ${uniqueQuestions.length} unique questions`);
    
    // Step 2: Get category-specific seen questions to avoid repeats across sessions
    const categorySeenIds = getCategorySeenQuestions(categoryId);
    console.log(`Found ${categorySeenIds.length} previously seen questions in category ${categoryId}`);
    
    // Step 3: If nearly all questions in this category have been seen, reset tracking
    if (resetCategorySeenQuestionsIfNeeded(categoryId, uniqueQuestions.length)) {
      // Clear the seen questions list for this category
      console.log('Reset seen questions for this category, all questions are now available');
      // Empty the list for this function execution
      categorySeenIds.length = 0;
    }
    
    // Step 4: Combine category-specific seen IDs with session-specific seen IDs
    const allSeenIds = [...new Set([...categorySeenIds, ...seenQuestionIds])];
    console.log(`Total seen question IDs (category + session): ${allSeenIds.length}`);
    
    // Step 5: Filter out seen questions if we have enough remaining
    let availableQuestions = uniqueQuestions;
    if (allSeenIds.length > 0) {
      availableQuestions = uniqueQuestions.filter(q => {
        const questionId = q._id.$oid || q._id;
        return !allSeenIds.includes(questionId);
      });
      console.log(`After removing seen questions: ${availableQuestions.length} available questions`);
    }
    
    // Special case: If total unique questions is less than our limit, we need to handle this differently
    if (uniqueQuestions.length < limit) {
      console.log(`Category has only ${uniqueQuestions.length} unique questions, which is less than the requested ${limit}`);
      
      // Reset seen questions if needed to ensure we have fresh questions
      if (availableQuestions.length < Math.min(5, uniqueQuestions.length)) {
        console.log('Very few unseen questions left, resetting category seen questions');
        const userId = typeof getUserId === 'function' ? getUserId() : 'guest';
        const key = `categorySeenQuestions_${userId}_${categoryId}`;
        localStorage.removeItem(key);
        
        // Now all questions are available
        availableQuestions = uniqueQuestions;
        
        // But still respect current session seen questions to avoid duplicates in the current session
        if (seenQuestionIds.length > 0) {
          availableQuestions = uniqueQuestions.filter(q => {
            const questionId = q._id.$oid || q._id;
            return !seenQuestionIds.includes(questionId);
          });
        }
        
        console.log(`After resetting, now have ${availableQuestions.length} available questions`);
      }
      
      // If we still don't have enough questions, repeat some questions to reach the limit
      if (availableQuestions.length < limit) {
        let selectedQuestions = [...availableQuestions]; // Start with what we have
        
        // How many more do we need?
        let additionalNeeded = limit - selectedQuestions.length;
        console.log(`Need ${additionalNeeded} more questions to reach ${limit}`);
        
        // Use questions from the category that aren't in the current session
        // We may need to repeat some questions
        const repeatedQuestions = [];
        while (repeatedQuestions.length < additionalNeeded) {
          // Take a random subset of questions from the category
          const candidateQuestions = shuffleArray([...uniqueQuestions]);
          
          // Take as many as we need, filtering out ones already in this session's set
          const selectedIds = selectedQuestions.map(q => q.question); // Use question text for uniqueness
          
          for (const q of candidateQuestions) {
            if (repeatedQuestions.length >= additionalNeeded) break;
            
            if (!selectedIds.includes(q.question)) {
              repeatedQuestions.push(q);
              selectedIds.push(q.question);
            }
          }
          
          // If we've gone through all questions and still don't have enough,
          // we'll need to accept some duplicates within this set as a last resort
          if (repeatedQuestions.length < additionalNeeded && 
              repeatedQuestions.length + selectedQuestions.length === uniqueQuestions.length) {
            console.log('All unique questions used, allowing some duplicates within set');
            
            // Add duplicates to reach limit
            const moreNeeded = additionalNeeded - repeatedQuestions.length;
            const extraDuplicates = shuffleArray([...uniqueQuestions])
              .slice(0, moreNeeded);
              
            repeatedQuestions.push(...extraDuplicates);
          }
        }
        
        console.log(`Added ${repeatedQuestions.length} additional questions to reach ${limit}`);
        selectedQuestions = [...selectedQuestions, ...repeatedQuestions];
        
        // Shuffle the final set
        selectedQuestions = shuffleArray(selectedQuestions);
        console.log(`Final set contains ${selectedQuestions.length} questions`);
        
        // Save the IDs of these questions as seen (except duplicates)
        const uniqueSelectedIds = [...new Set(selectedQuestions.map(q => q._id.$oid || q._id))];
        saveCategorySeenQuestions(categoryId, uniqueSelectedIds);
        
        // Format questions for compatibility
        return selectedQuestions.map(q => ({
          _id: q._id.$oid || q._id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: q.category,
          explanation: q.explanation || ""
        }));
      }
    }
    // Normal case: If we don't have enough unseen questions, use the least recently seen questions
    else if (availableQuestions.length < limit) {
      console.log(`Not enough unseen questions (${availableQuestions.length}), using least recently seen questions`);
      
      // Start with our available unseen questions
      const selectedQuestions = [...availableQuestions];
      
      // How many more questions we need
      const additionalNeeded = limit - selectedQuestions.length;
      
      if (additionalNeeded > 0 && categorySeenIds.length > 0) {
        console.log(`Need ${additionalNeeded} more questions, selecting from least recently seen`);
        
        // Find questions that have been seen but not in the current session
        const seenButNotInSession = uniqueQuestions.filter(q => {
          const questionId = q._id.$oid || q._id;
          return categorySeenIds.includes(questionId) && !seenQuestionIds.includes(questionId);
        });
        
        // Use the oldest seen questions first (the ones at the beginning of the seen array)
        // This assumes the list is in chronological order of when questions were seen
        const reusedQuestions = shuffleArray(seenButNotInSession).slice(0, additionalNeeded);
        console.log(`Selected ${reusedQuestions.length} previously seen questions to reuse`);
        
        // Add these to our selection
        selectedQuestions.push(...reusedQuestions);
      }
      
      availableQuestions = selectedQuestions;
    }
    
    // Step 7: Shuffle and select the requested number of questions
    const shuffled = shuffleArray(availableQuestions);
    const selectedQuestions = shuffled.slice(0, Math.min(limit, shuffled.length));
    console.log(`Selected ${selectedQuestions.length} questions for practice`);
    
    // Step 8: Save these question IDs as seen for this category
    const selectedIds = selectedQuestions.map(q => q._id.$oid || q._id);
    saveCategorySeenQuestions(categoryId, selectedIds);
    
    // Format questions for compatibility with the rest of the code
    return selectedQuestions.map(q => ({
      _id: q._id.$oid || q._id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      category: q.category,
      explanation: q.explanation || ""
    }));
  } catch (error) {
    console.error('Error getting practice questions:', error);
    return [];
  }
}

// Replace the server fetchQuestions function for practice
async function fetchLocalQuestionsForPractice(category) {
  try {
    console.log('Fetching local questions for category:', category);
    
    // Get seen question IDs to exclude (these are for the current session only)
    const seenIds = typeof getSeenQuestionIds === 'function' ? getSeenQuestionIds() : [];
    console.log('Excluding session seen question IDs count:', seenIds.length);
    
    // Define how many questions we want per practice session - always 20
    const QUESTIONS_PER_SET = 20;
    
    // Get questions, limiting to QUESTIONS_PER_SET per practice session
    let questions = await getPracticeQuestions(category, QUESTIONS_PER_SET, seenIds);
    
    // IMPORTANT: We do not mix categories anymore - but we do ensure we always have 20 questions
    console.log(`Found ${questions.length} questions for category: ${category}`);
    
    // Double check we have exactly 20 questions
    if (questions.length !== QUESTIONS_PER_SET) {
      console.warn(`Expected ${QUESTIONS_PER_SET} questions but got ${questions.length}. Adjusting...`);
      
      // If we somehow got more than 20, trim it down
      if (questions.length > QUESTIONS_PER_SET) {
        questions = questions.slice(0, QUESTIONS_PER_SET);
        console.log(`Trimmed down to ${questions.length} questions`);
      }
      // If we got fewer than 20, that's an error - the getPracticeQuestions function should've handled this
      else if (questions.length < QUESTIONS_PER_SET) {
        console.error(`Failed to get ${QUESTIONS_PER_SET} questions. Only have ${questions.length}`);
        // We'll continue with what we have, but log an error
      }
    }
    
    if (questions.length === 0) {
      throw new Error(`No questions found for category: ${category}`);
    }
    
    console.log(`Returning ${questions.length} questions for practice`);
    
    // Store the actual category for reference
    localStorage.setItem('actualSelectedCategory', category);
    
    // Always report 20 as the total for consistent UI
    return {
      subscription: 'basic',
      category: category,
      total: QUESTIONS_PER_SET,  // Always report 20 total questions
      selected: questions.length,
      questions: questions
    };
  } catch (error) {
    console.error('Error fetching local questions:', error);
    throw error;
  }
}

// Export the functions
window.fetchLocalQuestionsForPractice = fetchLocalQuestionsForPractice;
window.getQuestionsByCategory = getQuestionsByCategory;
window.fetchAllQuestions = fetchAllQuestions; 
window.getCategorySeenQuestions = getCategorySeenQuestions;
window.resetCategorySeenQuestionsIfNeeded = resetCategorySeenQuestionsIfNeeded; 