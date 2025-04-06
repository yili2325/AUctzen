const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Ensure database connection
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/auscitizen', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

// Connect to database
connectDB();

// Define the exact category names for the application
const EXACT_CATEGORIES = [
    'Australia and its people',
    'Australia\'s democratic beliefs, rights and liberties',
    'Government and the law in Australia',
    'Australian values'
];

// Function to normalize apostrophes for comparison
const normalize = (str) => {
    if (!str) return '';
    // Replace all types of apostrophes with a standard straight apostrophe
    return str.toLowerCase().replace(/['''`]/g, "'");
};

// Updated helper function to get questions from database
async function getQuestions() {
    try {
        // Fetch all questions from the database
        const questions = await Question.find({});
        console.log('Database query result:', {
            totalQuestions: questions.length,
            sampleQuestion: questions[0]
        });
        return questions;
    } catch (error) {
        console.error('Error fetching questions from database:', error);
        throw error;
    }
}

// Helper function to transform questions for response
function transformQuestionsForResponse(questions, limit) {
    // Randomly select questions
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(limit, shuffled.length));
    
    // Transform questions to match frontend expectations
    return selected.map(q => ({
        _id: q._id.toString(),
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        category: q.category,
        explanation: q.explanation
    }));
}

// Special handling for category matching
function findMatchingCategory(categoryToMatch, dbCategories) {
    // Direct matching
    for (const dbCat of dbCategories) {
        if (dbCat === categoryToMatch) {
            console.log(`Direct match found for: "${categoryToMatch}"`);
            return dbCat;
        }
    }
    
    // Normalized matching
    const normalizedToMatch = normalize(categoryToMatch);
    for (const dbCat of dbCategories) {
        if (normalize(dbCat) === normalizedToMatch) {
            console.log(`Normalized match found for: "${categoryToMatch}" -> "${dbCat}"`);
            return dbCat;
        }
    }
    
    // Special case for the problematic category
    if (categoryToMatch.includes('democratic beliefs')) {
        console.log('Trying special match for democratic beliefs category');
        for (const dbCat of dbCategories) {
            if (dbCat.includes('democratic beliefs')) {
                console.log(`Special match found: "${dbCat}"`);
                return dbCat;
            }
        }
    }
    
    return null;
}

// Get questions for practice
router.get('/practice', async (req, res) => {
    try {
        console.log('\n======= PRACTICE QUESTIONS REQUEST =======');
        console.log('Fetching practice questions...');
        const { category, debug, exclude, limit, random } = req.query;
        const isDebug = debug === 'true';
        const isRandom = random !== 'false'; // Default to true
        const questionsLimit = parseInt(limit) || 20; // Default to 20 questions
        
        // Parse excluded question IDs (comma-separated list)
        let excludedIds = [];
        if (exclude) {
            excludedIds = exclude.split(',').filter(id => id.trim().length > 0);
            console.log(`Excluding ${excludedIds.length} previously seen questions`);
            if (isDebug && excludedIds.length > 0) {
                console.log('First 5 excluded IDs:', excludedIds.slice(0, 5));
            }
        }
        
        console.log(`Raw category received: "${category}"`);
        // All users have full access to questions
        
        // Ensure database connection
        if (mongoose.connection.readyState !== 1) {
            console.log('Database connection not ready, attempting to connect...');
            await mongoose.connect('mongodb://localhost:27017/auscitizen', {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log('MongoDB Connected');
        }

        // Get all questions from the database - we need this to get valid categories
        const allQuestions = await Question.find({}).lean();
        console.log(`Total questions in database: ${allQuestions.length}`);
        
        // Extract unique categories from database for debugging
        const dbCategories = [...new Set(allQuestions.map(q => q.category))];
        const categoryCounts = {};
        dbCategories.forEach(cat => {
            categoryCounts[cat] = allQuestions.filter(q => q.category === cat).length;
        });
        
        console.log('Categories in database:', categoryCounts);
        
        // If a specific category was requested
        let matchedCategory = null;
        let categoryQuery = {};
        
        if (category) {
            // Special case for Australian values
            if (category === 'Australian values') {
                console.log('Specific handling for Australian values category');
                
                // Build query with exclusions
                let valueQuery = { category: 'Australian values' };
                if (excludedIds.length > 0) {
                    valueQuery._id = { $nin: excludedIds };
                }
                
                // Get all questions for this category without any random selection first
                const valueQuestions = await Question.find(valueQuery).lean();
                console.log(`Found ${valueQuestions.length} questions for Australian values category (after exclusions)`);
                
                if (valueQuestions.length > 0) {
                    // Use a better randomization technique for consistent randomization
                    // Fisher-Yates shuffle algorithm
                    const shuffleArray = array => {
                        for (let i = array.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [array[i], array[j]] = [array[j], array[i]];
                        }
                        return array;
                    };
                    
                    // Apply randomization only if requested
                    let questionsToUse = valueQuestions;
                    if (isRandom) {
                        // Create a copy to avoid modifying the original array
                        questionsToUse = shuffleArray([...valueQuestions]);
                    }
                    
                    // For debugging, log all the question IDs we're selecting
                    console.log('Selected question IDs:', questionsToUse.slice(0, questionsLimit).map(q => q._id.toString()));
                    
                    // Transform and return the questions
                    const transformedQuestions = questionsToUse.slice(0, questionsLimit).map(q => ({
                        _id: q._id.toString(),
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        category: q.category,
                        explanation: q.explanation
                    }));
                    
                    return res.json({
                        questions: transformedQuestions,
                        total: allQuestions.length,
                        totalInCategory: valueQuestions.length,
                        totalExcluded: excludedIds.length,
                        selected: transformedQuestions.length,
                        category: 'Australian values'
                    });
                }
            }
            
            // Check if this exact category exists
            const exactMatch = dbCategories.find(cat => cat === category);
            if (exactMatch) {
                console.log(`Found exact category match: "${exactMatch}"`);
                matchedCategory = exactMatch;
                categoryQuery = { category: matchedCategory };
            } else {
                // Try case-insensitive match
                const ciMatch = dbCategories.find(cat => 
                    cat.toLowerCase() === category.toLowerCase()
                );
                if (ciMatch) {
                    console.log(`Found case-insensitive match: "${ciMatch}"`);
                    matchedCategory = ciMatch;
                    categoryQuery = { category: matchedCategory };
                } else {
                    // Try partial match with "Australia values" - common pattern
                    if (category.includes('values')) {
                        const valueCategory = dbCategories.find(cat => 
                            cat.toLowerCase().includes('values')
                        );
                        if (valueCategory) {
                            console.log(`Found "values" category match: "${valueCategory}"`);
                            matchedCategory = valueCategory;
                            categoryQuery = { category: matchedCategory };
                        }
                    }
                    // Special case for democratic beliefs
                    else if (category.includes('democratic') || category.includes('beliefs')) {
                        const beliefCategory = dbCategories.find(cat => 
                            cat.toLowerCase().includes('democratic') || cat.toLowerCase().includes('beliefs')
                        );
                        if (beliefCategory) {
                            console.log(`Found "democratic/beliefs" category match: "${beliefCategory}"`);
                            matchedCategory = beliefCategory;
                            categoryQuery = { category: matchedCategory };
                        }
                    }
                    else {
                        console.log(`No match found for category: "${category}"`);
                        // Return all questions if no match found
                        matchedCategory = null;
                        categoryQuery = {};
                    }
                }
            }
        }
        
        // Add exclusion to query if provided
        if (excludedIds.length > 0) {
            categoryQuery._id = { $nin: excludedIds.map(id => mongoose.Types.ObjectId(id)) };
        }
        
        // Log the final query
        console.log('Final query:', JSON.stringify(categoryQuery, null, 2));
        
        // Query the database with the category filter
        const questions = await Question.find(categoryQuery).lean();
        console.log(`Found ${questions.length} questions matching the query (after exclusions)`);
        
        if (questions.length === 0) {
            // If no questions found after exclusions, try without exclusions
            if (excludedIds.length > 0) {
                console.log('No questions available after exclusions, trying without exclusions');
                const { _id, ...queryWithoutExclusions } = categoryQuery;
                const allAvailableQuestions = await Question.find(queryWithoutExclusions).lean();
                
                if (allAvailableQuestions.length > 0) {
                    console.log(`Found ${allAvailableQuestions.length} questions without exclusion filter`);
                    
                    // Select questions randomly from all available
                    const shuffled = [...allAvailableQuestions].sort(() => 0.5 - Math.random());
                    const selected = shuffled.slice(0, Math.min(questionsLimit, shuffled.length));
                    
                    // Transform questions for response
                    const transformedQuestions = selected.map(q => ({
                        _id: q._id.toString(),
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        category: q.category,
                        explanation: q.explanation
                    }));
                    
                    return res.json({
                        questions: transformedQuestions,
                        total: allQuestions.length,
                        totalInCategory: allAvailableQuestions.length,
                        fallback: true,
                        message: 'No unviewed questions available, showing some previously seen questions',
                        selected: transformedQuestions.length,
                        category: matchedCategory || 'All Categories'
                    });
                }
            }
            
            return res.status(404).json({
                message: `No questions found${category ? ` for category: ${category}` : ''}`,
                availableCategories: dbCategories
            });
        }
        
        // More detailed logging for debugging
        if (isDebug) {
            // Log sample questions
            console.log(`Sample questions (showing 3 of ${questions.length}):`);
            questions.slice(0, 3).forEach((q, i) => {
                console.log(`- Question ${i+1}: ${q.question.substring(0, 50)}... (Category: ${q.category})`);
            });
        }
        
        // Randomly select questions up to the limit
        let selected = questions;
        if (isRandom) {
            const shuffled = [...questions].sort(() => 0.5 - Math.random());
            selected = shuffled.slice(0, Math.min(questionsLimit, shuffled.length));
        } else {
            selected = questions.slice(0, Math.min(questionsLimit, questions.length));
        }
        
        console.log(`Selected ${selected.length} questions for response (limit: ${questionsLimit})`);
        
        if (isDebug) {
            // Log selected question IDs
            console.log('Selected question IDs:', selected.map(q => q._id));
        }
        
        // Transform questions for response
        const transformedQuestions = selected.map(q => ({
            _id: q._id.toString(),
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            category: q.category,
            explanation: q.explanation
        }));
        
        // Send response
        res.json({
            questions: transformedQuestions,
            total: allQuestions.length,
            totalInCategory: matchedCategory ? questions.length : questions.length,
            totalExcluded: excludedIds.length,
            selected: transformedQuestions.length,
            category: matchedCategory || 'All Categories',
            debug: isDebug ? {
                allCategories: dbCategories,
                categoryCounts
            } : undefined
        });
    } catch (err) {
        console.error('Error in practice route:', err);
        res.status(500).json({
            message: 'Failed to fetch practice questions',
            error: err.message
        });
    }
});

// Get random questions by category
router.get('/random/:category', async (req, res) => {
    try {
        const { category } = req.params;
        console.log(`Random questions requested for category: "${category}"`);
        
        // Get all questions first for any potential fallbacks
        const allQuestions = await getQuestions();
        
        // Extract unique categories from database
        const dbCategories = [...new Set(allQuestions.map(q => q.category))];
        
        // Special case for democratic beliefs category
        if (category && (category.includes('democratic beliefs') || category.toLowerCase().includes('democratic'))) {
            console.log('Democratic beliefs category detected in random endpoint');
            
            // Check if we have any questions for this category by trying different variants
            const possibleCategories = [
                "Australia's democratic beliefs, rights and liberties",
                "Australia's democratic beliefs",
                "Australian democratic beliefs",
                "Democratic beliefs"
            ];
            
            let foundQuestions = [];
            
            // Try each possible category name
            for (const possibleCategory of possibleCategories) {
                console.log(`Trying to find questions with category: "${possibleCategory}"`);
                const questions = await Question.find({ 
                    category: { $regex: new RegExp(possibleCategory, 'i') }
                }).lean();
                
                if (questions.length > 0) {
                    console.log(`Found ${questions.length} questions with category similar to: "${possibleCategory}"`);
                    foundQuestions = questions;
                    break;
                }
            }
            
            if (foundQuestions.length > 0) {
                // Randomly select questions
                const shuffled = [...foundQuestions].sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, Math.min(20, shuffled.length));
                
                return res.json(selected);
            } else {
                // If still no questions found, search for any questions containing "democratic" in the category
                console.log('No exact matches found, trying broader search...');
                const broadSearch = await Question.find({
                    category: { $regex: /democratic/i }
                }).lean();
                
                if (broadSearch.length > 0) {
                    console.log(`Found ${broadSearch.length} questions with "democratic" in category`);
                    
                    // Randomly select questions
                    const shuffled = [...broadSearch].sort(() => 0.5 - Math.random());
                    const selected = shuffled.slice(0, Math.min(20, shuffled.length));
                    
                    return res.json(selected);
                } else {
                    // Ultimate fallback - return all questions if no matching category found
                    console.log('No democratic-related questions found in database, returning all questions as fallback');
                    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
                    const selected = shuffled.slice(0, Math.min(20, shuffled.length));
                    
                    // Add fallback message property to the response
                    selected.forEach(q => q.fallback = true);
                    
                    return res.json(selected);
                }
            }
        }
        
        // For other categories, use normal matching
        const normalizedRequestedCategory = normalize(category);
        
        // Find direct match in database
        let matchingCategory = dbCategories.find(dbCat => 
            dbCat === category || 
            normalize(dbCat) === normalizedRequestedCategory ||
            dbCat.toLowerCase() === category.toLowerCase()
        );
        
        if (matchingCategory) {
            console.log(`Found matching category: "${matchingCategory}"`);
            
            // Filter questions by the matching category
            const categoryQuestions = allQuestions.filter(q => q.category === matchingCategory);
            
            // Randomly select questions
            const shuffled = [...categoryQuestions].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, Math.min(20, shuffled.length));
            
            return res.json(selected);
        } else {
            // Ultimate fallback - return all questions if no matching category found
            console.log(`No matching category found for "${category}", returning random questions as fallback`);
            const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, Math.min(20, shuffled.length));
            
            // Add fallback message property to the response
            selected.forEach(q => q.fallback = true);
            
            return res.json(selected);
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get all categories
router.get('/categories', async (req, res) => {
    try {
        // Ensure database connection
        if (mongoose.connection.readyState !== 1) {
            console.log('Database connection not ready in categories endpoint, attempting to connect...');
            await mongoose.connect('mongodb://localhost:27017/auscitizen', {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log('MongoDB Connected');
        }

        // Get all questions to extract categories
        const questions = await Question.find({}).lean();
        console.log(`Found ${questions.length} questions in database for categories extraction`);
        
        // Extract unique categories from database
        const dbCategories = [...new Set(questions.map(q => q.category).filter(Boolean))];
        console.log(`Extracted ${dbCategories.length} unique categories from database`);
        
        // Ensure all EXACT_CATEGORIES are included
        const allCategories = [...new Set([...dbCategories, ...EXACT_CATEGORIES])];
        console.log('Final categories list:', allCategories);
        
        res.json(allCategories);
    } catch (err) {
        console.error('Error in categories endpoint:', err.message);
        // Even if there's an error, return at least the EXACT_CATEGORIES
        res.json(EXACT_CATEGORIES);
    }
});

// Get raw categories from database
router.get('/raw-categories', async (req, res) => {
    try {
        const allQuestions = await Question.find({}).lean();
        
        // Extract unique categories and their counts
        const categoryCounts = {};
        allQuestions.forEach(q => {
            if (q.category) {
                if (!categoryCounts[q.category]) {
                    categoryCounts[q.category] = 0;
                }
                categoryCounts[q.category]++;
            }
        });
        
        // Convert to array of objects with details
        const categories = Object.keys(categoryCounts).map(category => ({
            category,
            count: categoryCounts[category],
            normalized: category.toLowerCase().replace(/['''`]/g, "'")
        }));
        
        res.json({
            categories,
            total: categories.length,
            questionCount: allQuestions.length
        });
    } catch (err) {
        console.error('Error fetching raw categories:', err);
        res.status(500).json({
            message: 'Failed to fetch raw categories',
            error: err.message
        });
    }
});

module.exports = router; 