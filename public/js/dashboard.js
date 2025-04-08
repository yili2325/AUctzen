document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard.js version 2.2 loaded');
    
    // Check if user is logged in using our auth helper
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        console.log('User not logged in, redirecting to login page');
        window.location.href = '/login.html?redirect=/dashboard.html';
        return;
    }
    
    // Check if this is a new user session by comparing with stored user ID
    checkAndHandleUserChange();
    
    // Show initial loading state
    showLoadingState();
    
    // Load dashboard data immediately
    loadDashboardData();
    
    // Update stats every 15 seconds (more frequent updates)
    setInterval(loadDashboardData, 15000);

    // Initialize performance chart
    initializePerformanceChart();

    // Hide recent activity section for all users - Remove it completely
    removeRecentActivitySection();

    // Setup test completion listener
    setupTestCompletionListener();
});

// Check if the current user is different from the previous user and handle session change
function checkAndHandleUserChange() {
    let currentUserId = null;
    let previousUserId = localStorage.getItem('dashboardLastUserId');
    
    // Get current user ID
    try {
        if (typeof getCurrentUser === 'function') {
            const userData = getCurrentUser();
            currentUserId = userData?.id || userData?.userId || null;
        } else {
            const userData = JSON.parse(localStorage.getItem('user')) || {};
            currentUserId = userData.id || userData.userId || null;
        }
    } catch (e) {
        console.error('Error getting current user ID:', e);
    }
    
    console.log('Current user ID:', currentUserId, 'Previous user ID:', previousUserId);
    
    // If user has changed, update dashboard for new user but DON'T clear their data
    if (currentUserId !== previousUserId) {
        console.log('User changed detected! Updating dashboard for new user');
        resetDashboardDisplay(); // Only reset display, not the actual data
        
        // Store new user ID
        localStorage.setItem('dashboardLastUserId', currentUserId);
    }
}

// Reset the dashboard display when switching users (but don't delete actual data)
function resetDashboardDisplay() {
    // Reset dashboard display elements to show loading state
    document.querySelectorAll('.stat-value').forEach(el => {
        el.textContent = '0';
    });
    
        document.getElementById('avg-score').textContent = '0%';
        document.getElementById('study-time').textContent = '0h';
        
    // Reset any chart data
    if (window.performanceChart) {
        window.performanceChart.data.labels = [];
        window.performanceChart.data.datasets[0].data = [];
        window.performanceChart.update();
    }
    
    // Reset category performance display
    const categoryList = document.querySelector('.category-list');
    if (categoryList) {
        categoryList.innerHTML = '';
    }
    
    // Reset recommendations display
    const recommendationsList = document.querySelector('.recommendation-list');
    if (recommendationsList) {
        recommendationsList.innerHTML = '<div class="empty">Complete practice tests to get personalized recommendations</div>';
    }
}

// Show loading state for dashboard stats
function showLoadingState() {
    document.querySelectorAll('.stat-value').forEach(el => {
        el.innerHTML = '<div class="loading-spinner" style="width: 15px; height: 15px; display: inline-block;"></div>';
    });
}

// Remove the recent activity section completely for all users
function removeRecentActivitySection() {
    const recentActivity = document.querySelector('.recent-activity');
    if (recentActivity) {
        recentActivity.remove();
    }
}

// Handle different subscription tiers - simplified to always show all features
function handleSubscriptionTier(userTier) {
    console.log('Setting up dashboard for user tier:', userTier);
    
    // All users have access to all features
    const sections = [
        document.querySelector('.performance-chart'),
        document.querySelector('.category-performance'),
        document.querySelector('.recommendations')
    ].filter(section => section !== null);
    
    console.log(`Found ${sections.length} dashboard sections to process`);
    
    // Make sure all sections are visible for all users
    sections.forEach((section, index) => {
        console.log(`[${index + 1}/${sections.length}] Ensuring section is visible:`, section.querySelector('h2')?.textContent);
        
        // Remove any existing premium overlays if they exist
        const overlay = section.querySelector('.premium-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Remove premium-section class if it exists
        section.classList.remove('premium-section');
        
        // Restore visibility of content
        const contentContainers = section.querySelectorAll('.chart-container, .category-list, .recommendation-list');
        contentContainers.forEach(container => {
            if (container) {
                container.style.opacity = '1';
                container.style.visibility = 'visible';
                container.style.filter = 'none';
            }
        });
    });
}

// Update loadDashboardData to treat all users as premium
async function loadDashboardData() {
    console.log('Loading dashboard data');
    
    // Treat all users as having full access
    let userTier = 'premium';
    
    try {
        // Get user data from localStorage for display purposes
        if (typeof getCurrentUser === 'function') {
            const userData = getCurrentUser();
            console.log('User data retrieved from auth system:', userData);
        } else {
            // Fallback to localStorage
            const userData = JSON.parse(localStorage.getItem('user')) || {};
            console.log('User data retrieved from localStorage:', userData);
        }
    } catch (e) {
        console.error('Error getting user data:', e);
    }
    
    console.log('All users now have full access to all features');
    
    // Apply full access features
    handleSubscriptionTier(userTier);
    
    try {
        // Try to fetch data from API
        const response = await fetch('/api/dashboard', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }
        
        const data = await response.json();
        console.log('Retrieved real-time dashboard data', data);
        updateDashboard(data);
    } catch (error) {
        console.log('Error fetching dashboard data:', error.message);
        console.log('Using local storage data as fallback');
        
        // Fallback to localStorage data
        const localData = getStatsFromLocalStorage();
        console.log('Using local fallback data:', localData);
        updateDashboard(localData);
        
        // Update the stats again when the testResults in localStorage changes
        window.addEventListener('storage', function(e) {
            if (e.key === 'testResults') {
                console.log('Test results updated in localStorage, refreshing dashboard');
                const updatedData = getStatsFromLocalStorage();
                updateDashboard(updatedData);
            }
        });
    }

    // After data is loaded, update the indicator
    addLastUpdatedIndicator();
}

function updateDashboard(data) {
    console.log('Updating dashboard with data:', data);
    
    // Get user data to determine subscription
    const userData = typeof getCurrentUser === 'function' ? getCurrentUser() : JSON.parse(localStorage.getItem('user')) || {};
    const userTier = (userData.plan || userData.subscriptionTier || 'basic').toLowerCase();
    
    console.log('User tier for dashboard update:', userTier);
    
    const isPremiumUser = userTier === 'premium' || userTier === 'lifetime';
    
    // Update overall stats with animations
    animateStats('tests-completed', data.testsCompleted || 0);
    animateStats('avg-score', data.averageScore || 0, true);
    animateStats('questions-answered', data.questionsAnswered || 0);
    animateStats('study-time', data.totalStudyTime || 0, false, true);
    
    try {
        // Update category performance (premium feature)
        if (data.categoryPerformance && (userTier !== 'basic' || true)) { // Always update data for visual purposes
            updateCategoryPerformance(data.categoryPerformance);
        }
        
        // Update performance chart (premium feature)
        if (data.performanceHistory && (userTier !== 'basic' || true)) { // Always update data for visual purposes
            updatePerformanceChart(data.performanceHistory);
        }
        
        // Update recommendations (premium feature)
        if (userTier !== 'basic' || true) { // Always update data for visual purposes
            updateRecommendations(data.recommendations || []);
        }
    } catch (error) {
        console.error('Error updating premium dashboard sections:', error);
        // Show error message to user if toast function is available
        if (typeof showToast === 'function') {
            showToast(createToast('error', 'Failed to load some dashboard features. Please try refreshing.'));
        }
    }
    
    // Update subscription info if available
    if (data.subscription) {
        // Get registration date from user data if available
        const registrationDate = userData.registrationDate || userData.createdAt || new Date().toISOString();
        data.subscription.registrationDate = registrationDate;
        
        // Remove any existing renewalDate so our calculation is used instead
        if (data.subscription.renewalDate) {
            delete data.subscription.renewalDate;
        }
        
        updateSubscriptionInfo(data.subscription);
    } else {
        // Fallback for subscription info
        const planDisplayName = userTier.charAt(0).toUpperCase() + userTier.slice(1);
        // Get registration date from user data if available
        const registrationDate = userData.registrationDate || userData.createdAt || new Date().toISOString();
        updateSubscriptionInfo({
            type: planDisplayName,
            status: 'Active',
            registrationDate: registrationDate
            // Don't include renewalDate here so our calculation in updateSubscriptionInfo is used
        });
    }
    
    // If any tests were completed recently, show a notification
    if (data.recentCompletedTest) {
        showRecentTestNotification(data.recentCompletedTest);
    }
}

function updateCategoryPerformance(categoryData) {
    const categoryList = document.querySelector('.category-list');
    if (!categoryList) return;
    
    categoryList.innerHTML = '';
    
    // Sort categories by score (lowest first for recommendations)
    const sortedCategories = Object.entries(categoryData)
        .sort((a, b) => a[1].score - b[1].score);
    
    sortedCategories.forEach(([category, data]) => {
        const score = data.score || 0;
        const total = data.total || 1; // Avoid division by zero
        const percentage = Math.round((score / total) * 100);
        
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.innerHTML = `
            <div class="category-header">
                <div class="category-icon">
                    <i class="fas fa-${getCategoryIcon(category)}"></i>
                </div>
                <h3 class="category-title">${formatCategoryName(category)}</h3>
            </div>
            <div class="category-score">
                Score: ${score}/${total} (${percentage}%)
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
            `;
            
        categoryList.appendChild(categoryItem);
        });
}

function updateRecommendations(recommendations) {
    const recommendationsList = document.getElementById('recommendation-list');
    if (!recommendationsList) return;
    
    // Clear current recommendations
    recommendationsList.innerHTML = '';
    
    // If no recommendations, show a prompt
    if (!recommendations || recommendations.length === 0) {
        recommendationsList.innerHTML = `
            <a href="/practice_main.html" class="practice-recommendation-card">
                <div class="practice-recommendation-content">
                    <div class="recommendation-icon">
                        <i class="fas fa-clipboard-check"></i>
                    </div>
                    <div class="recommendation-text">
                        <p>Take practice tests to get personalized recommendations</p>
                    </div>
                </div>
            </a>
        `;
        return;
    }
    
    // Add each recommendation
    recommendations.forEach(recommendation => {
        // Simplified recommendation format
        const recommendationCard = document.createElement('a');
        recommendationCard.href = `/practice.html?category=${encodeURIComponent(recommendation.category)}`;
        recommendationCard.className = 'practice-recommendation-card';
        
        const content = document.createElement('div');
        content.className = 'practice-recommendation-content';
        
        // Create icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'recommendation-icon';
        const iconElement = document.createElement('i');
        iconElement.className = getCategoryIcon(recommendation.category);
        iconDiv.appendChild(iconElement);
        
        // Create text content
        const textDiv = document.createElement('div');
        textDiv.className = 'recommendation-text';
        const textP = document.createElement('p');
        textP.textContent = recommendation.message || `Practice ${formatCategoryName(recommendation.category)} to improve your score`;
        textDiv.appendChild(textP);
        
        // Assemble card
        content.appendChild(iconDiv);
        content.appendChild(textDiv);
        recommendationCard.appendChild(content);
        
        // Add to list
        recommendationsList.appendChild(recommendationCard);
    });
}

// Helper function to determine score class for styling
function getScoreClass(percentage) {
    if (percentage < 50) return 'low';
    if (percentage < 70) return 'medium';
    return 'high';
}

function getCategoryIcon(category) {
    const icons = {
        'government': 'landmark',
        'history': 'book',
        'geography': 'globe',
        'rights': 'balance-scale',
        'symbols': 'flag',
        'responsibilities': 'clipboard-list',
        'values': 'heart',
        'identity': 'id-card'
    };
    
    return icons[category.toLowerCase()] || 'question';
}

function formatCategoryName(category) {
    return category
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function startPracticeSet(category) {
    console.log(`Starting practice for category: ${category}`);
    
    try {
        // All users can access category-specific practice
        console.log(`Enabling category practice for: ${category}`);
        // Store the selected category in localStorage
        localStorage.setItem('selectedCategory', category);
        // Redirect to practice page with category parameter
        window.location.href = `/practice_main.html?category=${encodeURIComponent(category)}`;
    } catch (e) {
        console.error('Error starting category practice:', e);
        // Fallback to regular practice
        window.location.href = '/practice_main.html';
    }
}

// Display a toast notification
function showToast(toast) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
        
        // Add styles for toast container
        const style = document.createElement('style');
        style.textContent = `
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .toast {
                padding: 12px 16px;
                border-radius: 4px;
                color: white;
                font-weight: 500;
                display: flex;
                align-items: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: fade-in 0.3s ease, slide-in 0.3s ease;
                max-width: 350px;
            }
            .toast i {
                margin-right: 8px;
            }
            .toast.success {
                background-color: #28a745;
            }
            .toast.error {
                background-color: #dc3545;
            }
            .toast.info {
                background-color: #17a2b8;
            }
            .toast.warning {
                background-color: #ffc107;
                color: #212529;
            }
            @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slide-in {
                from { transform: translateX(50px); }
                to { transform: translateX(0); }
            }
            @keyframes fade-out {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create toast element
    const toastElement = document.createElement('div');
    toastElement.className = `toast ${toast.type}`;
    
    // Set appropriate icon
    let icon = 'info-circle';
    if (toast.type === 'error') icon = 'exclamation-circle';
    if (toast.type === 'success') icon = 'check-circle';
    if (toast.type === 'warning') icon = 'exclamation-triangle';
    
    toastElement.innerHTML = `<i class="fas fa-${icon}"></i> ${toast.message}`;
    
    // Add to container
    toastContainer.appendChild(toastElement);
    
    // Remove after timeout
    setTimeout(() => {
        toastElement.style.animation = 'fade-out 0.3s ease forwards';
        setTimeout(() => {
            toastElement.remove();
        }, 300);
    }, 4000);
    
    return toastElement;
}

// Create a toast notification object
function createToast(type, message) {
    return {
        type: type,
        message: message
    };
}

function updateRecentActivity(activities) {
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = activities.length ? '' : '<li class="activity-item">No recent activity</li>';

    activities.forEach(activity => {
        const li = document.createElement('li');
        li.className = 'activity-item';
        li.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
        </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-details">${activity.details}</div>
                <div class="activity-date">${formatDate(activity.date)}</div>
        </div>
    `;
        activityList.appendChild(li);
    });
}

function updateSubscriptionInfo(subscriptionData) {
    console.log('Updating subscription info:', subscriptionData);
    
    // Get DOM elements
    const planElement = document.getElementById('subscription-plan');
    const statusElement = document.getElementById('subscription-status');
    const badgeElement = document.getElementById('subscription-badge');
    const renewalElement = document.getElementById('subscription-renewal');
    const registrationDateElement = document.getElementById('registration-date');
    
    // Set default values for free service
    if (planElement) planElement.textContent = 'Complete Access';
    if (statusElement) statusElement.textContent = 'Active';
    if (renewalElement) renewalElement.textContent = '$0 - Always Free';
    
    // Update badge to show Free status
    if (badgeElement) {
        badgeElement.textContent = 'Free';
        badgeElement.className = 'subscription-badge free';
    }
    
    // Try to get and format the registration date
    try {
        let registrationDate = 'N/A';
        
        // Try to get from user data first
        const userData = JSON.parse(localStorage.getItem('user')) || {};
        if (userData.createdAt) {
            registrationDate = formatDate(userData.createdAt);
        } else if (subscriptionData && subscriptionData.startDate) {
            registrationDate = formatDate(subscriptionData.startDate);
        }
        
        if (registrationDateElement) {
            registrationDateElement.textContent = registrationDate;
        }
    } catch (e) {
        console.error('Error updating registration date:', e);
        if (registrationDateElement) {
            registrationDateElement.textContent = 'N/A';
        }
    }
}

let performanceChart = null;

function initializePerformanceChart() {
    const ctx = document.getElementById('performance-chart').getContext('2d');
    performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
            labels: [],
                datasets: [{
                label: 'Test Scores',
                data: [],
                borderColor: '#4CAF50',
                tension: 0.4,
                fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                    title: {
                        display: true,
                        text: 'Score (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Test Number'
                        }
                    }
                }
            }
        });
}

function updatePerformanceChart(performanceData) {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;
    
    chartContainer.innerHTML = ''; // Clear previous chart
    
    if (!performanceData || performanceData.length === 0) {
        chartContainer.innerHTML = '<div class="empty">Complete practice tests to see your performance over time</div>';
            return;
    }
    
    // Set up canvas for Chart.js
    const canvas = document.createElement('canvas');
    canvas.id = 'performance-chart';
    chartContainer.appendChild(canvas);
    
    // Format dates for display
    const labels = performanceData.map(entry => {
        const date = new Date(entry.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    
    const scores = performanceData.map(entry => entry.score);
    
    // Create chart using Chart.js (ensure it's loaded in your HTML)
    if (typeof Chart !== 'undefined') {
        new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Score %',
                    data: scores,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: {
                        target: 'origin',
                        above: 'rgba(75, 192, 192, 0.2)'
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Score (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Score: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });
    } else {
        // Fallback if Chart.js is not available
        chartContainer.innerHTML = '<div class="error-message">Chart.js library not loaded</div>';
    }
}

function animateStats(id, value, isPercentage = false, isTime = false) {
    const element = document.getElementById(id);
            if (!element) return;
            
    const duration = 1500; // Animation duration in ms
    const frameDuration = 1000/60; // 60fps
    const totalFrames = Math.round(duration / frameDuration);
    
    let frame = 0;
    const countTo = parseInt(value, 10);
    
    // For values that should animate more smoothly (like percentages)
    const easeOutQuad = t => t * (2 - t);
    
    const counter = setInterval(() => {
        frame++;
        
        const progress = easeOutQuad(frame / totalFrames);
        let currentCount = Math.round(countTo * progress);
        
        // Format based on type
        if (isPercentage) {
            element.textContent = `${currentCount}%`;
        } else if (isTime) {
            // Format as hours and minutes
            const hours = Math.floor(currentCount / 60);
            const minutes = currentCount % 60;
            element.textContent = hours > 0 ? 
                `${hours}h ${minutes}m` : 
                `${minutes}m`;
                    } else {
            element.textContent = currentCount.toString();
        }
        
        if (frame === totalFrames) {
            clearInterval(counter);
        }
    }, frameDuration);
}

function getActivityIcon(type) {
    const icons = {
        'test': 'fa-clipboard-check',
        'practice': 'fa-book',
        'achievement': 'fa-trophy',
        'subscription': 'fa-crown'
    };
    return icons[type] || 'fa-circle';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showErrorMessage(message) {
    // You can implement this based on your UI design
    console.error(message);
}

// Function to get stats from localStorage as a fallback
function getStatsFromLocalStorage() {
    console.log('Calculating stats from localStorage');
    
    // Get current user ID for user-specific data
    let userId = 'guest';
    try {
        if (typeof getCurrentUser === 'function') {
            const userData = getCurrentUser();
            userId = userData?.id || userData?.userId || 'guest';
                    } else {
            const userData = JSON.parse(localStorage.getItem('user')) || {};
            userId = userData.id || userData.userId || 'guest';
        }
    } catch (e) {
        console.error('Error getting current user ID:', e);
    }
    
    // Get user-specific test results
    const testResults = JSON.parse(localStorage.getItem(`testResults_${userId}`)) || [];
    console.log(`Fetching test results for user ${userId}:`, testResults.length, 'results found');
    
    // Initialize statistics
    const stats = {
        testsCompleted: testResults.length,
        questionsAnswered: 0,
        averageScore: 0,
        totalStudyTime: 0,
        categoryPerformance: {},
        performanceHistory: [],
        lastUpdated: new Date().toISOString(),
        userId: userId // Add userId to stats for reference
    };
    
    if (testResults.length === 0) {
        return stats;
    }
    
    // Calculate total questions answered and total correct
    let totalQuestions = 0;
    let totalCorrect = 0;
    
    // Get the most recent test
    const mostRecentTest = [...testResults].sort((a, b) => 
        new Date(b.date || 0) - new Date(a.date || 0)
    )[0];
    
    // Add recent test data if it exists and was completed in the last 30 seconds
    const thirtySecondsAgo = new Date();
    thirtySecondsAgo.setSeconds(thirtySecondsAgo.getSeconds() - 30);
    if (mostRecentTest && new Date(mostRecentTest.date) > thirtySecondsAgo) {
        stats.recentCompletedTest = {
            score: Math.round((mostRecentTest.correctAnswers / mostRecentTest.totalQuestions) * 100),
            date: mostRecentTest.date,
            category: mostRecentTest.category || 'General'
        };
    }
    
    // Process each test result
    testResults.forEach(result => {
        totalQuestions += result.totalQuestions || 0;
        totalCorrect += result.correctAnswers || 0;
        stats.totalStudyTime += result.duration || 0;
        
        // Add to performance history
        if (result.date) {
            stats.performanceHistory.push({
                date: result.date,
                score: result.correctAnswers / result.totalQuestions * 100
            });
        }
        
        // Process category performance
        if (result.categoryResults) {
            // Use the categoryResults object directly if available
            Object.entries(result.categoryResults).forEach(([category, catResult]) => {
                if (!stats.categoryPerformance[category]) {
                    stats.categoryPerformance[category] = { score: 0, total: 0 };
                }
                stats.categoryPerformance[category].score += catResult.correct || 0;
                stats.categoryPerformance[category].total += catResult.total || 0;
            });
        } else if (result.selectedCategory) {
            // Fallback to selectedCategory if categoryResults not available
            const category = result.selectedCategory;
            if (!stats.categoryPerformance[category]) {
                stats.categoryPerformance[category] = { score: 0, total: 0 };
            }
            stats.categoryPerformance[category].score += result.correctAnswers || 0;
            stats.categoryPerformance[category].total += result.totalQuestions || 0;
        } else if (result.category) {
            // Legacy support - basic fallback to category field
            const category = result.category;
            if (!stats.categoryPerformance[category]) {
                stats.categoryPerformance[category] = { score: 0, total: 0 };
            }
            stats.categoryPerformance[category].score += result.correctAnswers || 0;
            stats.categoryPerformance[category].total += result.totalQuestions || 0;
        }
    });
    
    // Calculate average score
    stats.questionsAnswered = totalQuestions;
    stats.averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    
    // Sort performance history by date
    stats.performanceHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Add user subscription info
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    stats.subscription = {
        type: (userData.subscriptionTier || 'basic').charAt(0).toUpperCase() + 
              (userData.subscriptionTier || 'basic').slice(1),
        status: 'Active'
        // Remove renewalDate so our calculation is used
    };
    
    console.log('Calculated stats from localStorage for user', userId, stats);
    return stats;
}

// Function to create placeholder content for basic users
function prepareBasicUserPlaceholders() {
    // Create placeholder for performance chart
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.innerHTML = `
            <canvas id="performance-chart"></canvas>
            <div class="placeholder-data">
                <div class="placeholder-line" style="width: 80%; height: 20px; margin: 10px 0;"></div>
                <div class="placeholder-line" style="width: 60%; height: 20px; margin: 10px 0;"></div>
                <div class="placeholder-line" style="width: 70%; height: 20px; margin: 10px 0;"></div>
            </div>
        `;
    }
    
    // Create placeholder for category performance
    const categoryList = document.querySelector('.category-list');
    if (categoryList) {
        categoryList.innerHTML = '';
        // Create 4 placeholder category items
        for (let i = 0; i < 4; i++) {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item placeholder-item';
            categoryItem.innerHTML = `
                <div class="category-header">
                    <div class="category-icon"></div>
                    <div class="placeholder-line" style="width: 70%; height: 15px;"></div>
                </div>
                <div class="placeholder-line" style="width: 40%; height: 12px; margin: 10px 0;"></div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.random() * 100}%"></div>
                </div>
            `;
            categoryList.appendChild(categoryItem);
        }
    }
    
    // Create placeholder for recommendations
    const recommendationsList = document.querySelector('.recommendation-list');
    if (recommendationsList) {
        recommendationsList.innerHTML = '';
        // Create 2 placeholder recommendation items
        for (let i = 0; i < 2; i++) {
            const recommendationItem = document.createElement('div');
            recommendationItem.className = 'recommendation-card placeholder-item';
            recommendationItem.innerHTML = `
                <div class="placeholder-line" style="width: 60%; height: 18px; margin-bottom: 15px;"></div>
                <div class="placeholder-line" style="width: 90%; height: 12px; margin-bottom: 8px;"></div>
                <div class="placeholder-line" style="width: 80%; height: 12px; margin-bottom: 15px;"></div>
                <div class="placeholder-button"></div>
            `;
            recommendationsList.appendChild(recommendationItem);
        }
    }
    
    // Add CSS for placeholders
    if (!document.getElementById('placeholder-styles')) {
        const style = document.createElement('style');
        style.id = 'placeholder-styles';
        style.textContent = `
            .placeholder-line {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: placeholder-wave 1.5s infinite;
                border-radius: 4px;
            }
            
            .placeholder-button {
                width: 100px;
                height: 30px;
                border-radius: 15px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: placeholder-wave 1.5s infinite;
            }
            
            .placeholder-item .category-icon {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: placeholder-wave 1.5s infinite;
            }
            
            @keyframes placeholder-wave {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Show notification for recently completed test
function showRecentTestNotification(testData) {
    // Create notification if it doesn't exist
    let notification = document.querySelector('.test-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'test-notification';
        document.body.appendChild(notification);
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon"><i class="fas fa-check-circle"></i></div>
            <div class="notification-text">
                <h4>Test Completed!</h4>
                <p>Score: ${testData.score}% - Great job!</p>
            </div>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 500);
    
    // Hide notification after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
    });
}

// Add a status indicator to show when the dashboard was last updated
function addLastUpdatedIndicator() {
    // Create or update the indicator
    let indicator = document.querySelector('.last-updated-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'last-updated-indicator';
        
        // Add it to the top of the dashboard
        const dashboardContainer = document.querySelector('.container');
        if (dashboardContainer) {
            dashboardContainer.insertBefore(indicator, dashboardContainer.firstChild);
        }
    }
    
    // Update the text
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    indicator.innerHTML = `
        <div class="update-status">
            <span class="update-dot"></span>
            <span class="update-text">Dashboard updated at ${timeString}</span>
        </div>
    `;
    
    // Show the indicator
    indicator.classList.add('show');
    
    // Hide it after 3 seconds
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 3000);
}

// Hook into test completion to refresh the dashboard and save user-specific data
function setupTestCompletionListener() {
    // Listen for custom event for test completion
    window.addEventListener('testCompleted', function(event) {
        console.log('Test completed event detected');
        
        // Get the test data from the event
        const testData = event.detail;
        
        // Save test data with user-specific key
        if (testData) {
            saveTestResultForCurrentUser(testData);
        }
        
        // Refresh dashboard data
        loadDashboardData();
    });
    
    // Listen for localStorage changes that include test results
    window.addEventListener('storage', function(event) {
        // Check if it's a test results key for any user
        if (event.key && event.key.startsWith('testResults_')) {
            console.log('Test results updated in localStorage:', event.key);
            
            // Only refresh if it's for the current user
            let currentUserId = 'guest';
            try {
                if (typeof getCurrentUser === 'function') {
                    const userData = getCurrentUser();
                    currentUserId = userData?.id || userData?.userId || 'guest';
                } else {
                    const userData = JSON.parse(localStorage.getItem('user')) || {};
                    currentUserId = userData.id || userData.userId || 'guest';
                }
                
                // If the updated key matches current user, refresh dashboard
                if (event.key === `testResults_${currentUserId}`) {
                    console.log('Refreshing dashboard for current user');
                    loadDashboardData();
                }
            } catch (e) {
                console.error('Error checking current user for storage event:', e);
            }
        }
    });
}

// Save test result for the current user
function saveTestResultForCurrentUser(testData) {
    // Get current user ID
    let userId = 'guest';
    try {
        if (typeof getCurrentUser === 'function') {
            const userData = getCurrentUser();
            userId = userData?.id || userData?.userId || 'guest';
        } else {
            const userData = JSON.parse(localStorage.getItem('user')) || {};
            userId = userData.id || userData.userId || 'guest';
        }
    } catch (e) {
        console.error('Error getting current user ID:', e);
    }
    
    // Get existing results for this user
    const existingResults = JSON.parse(localStorage.getItem(`testResults_${userId}`)) || [];
    
    // Add new result
    existingResults.push(testData);
    
    // Save back to localStorage with user-specific key
    localStorage.setItem(`testResults_${userId}`, JSON.stringify(existingResults));
    console.log(`Saved test result for user ${userId}`, testData);
    
    // Dispatch storage event for cross-tab updates
    window.dispatchEvent(new StorageEvent('storage', {
        key: `testResults_${userId}`,
        newValue: JSON.stringify(existingResults)
    }));
}

// Override the loadDashboardData function to include update indicator
const originalLoadDashboardData = loadDashboardData;
loadDashboardData = async function() {
    await originalLoadDashboardData.call(this);
    // After data is loaded, update the indicator
    addLastUpdatedIndicator();
};

// Setup the test completion listener when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    setupTestCompletionListener();
});

// Add this to the end of your file to make the functions available globally
window.startPracticeSet = startPracticeSet;