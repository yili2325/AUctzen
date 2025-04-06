document.addEventListener('DOMContentLoaded', function() {
    // Get results from localStorage
    const practiceResults = JSON.parse(localStorage.getItem('practiceResults') || '{}');
    const {
        score = 0,
        totalQuestions = 20,
        timeRemaining = 0,
        currentSet = 1,
        setsCompleted = 0,
        totalSets = 2
    } = practiceResults;

    // Calculate statistics
    const correctAnswers = score;
    const incorrectAnswers = totalQuestions - score;
    const accuracy = Math.round((score / totalQuestions) * 100);
    const timeTaken = 2700 - timeRemaining; // 45 minutes (2700 seconds) - remaining time

    // Format time taken
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Update the results page content
    document.querySelector('.results-container').innerHTML = `
        <div class="time-display">
            <i class="fas fa-clock"></i>
            Time Taken: ${timeFormatted}
        </div>
        <div class="stats-container">
            <div class="stat-item">
                <i class="fas fa-check-circle"></i>
                <span>${correctAnswers}</span>
                <label>Correct Answers</label>
            </div>
            <div class="stat-item">
                <i class="fas fa-times-circle"></i>
                <span>${incorrectAnswers}</span>
                <label>Incorrect Answers</label>
            </div>
            <div class="stat-item">
                <i class="fas fa-chart-pie"></i>
                <span>${accuracy}%</span>
                <label>Accuracy Rate</label>
            </div>
        </div>
        <div class="sets-progress">
            <i class="fas fa-tasks"></i>
            Practice Set ${currentSet} of ${totalSets} Completed
            <br>
            <span style="font-size: 1.1rem; opacity: 0.8; margin-top: 0.5rem; display: inline-block;">
                ${setsCompleted} of ${totalSets} sets completed
            </span>
        </div>
        ${setsCompleted < totalSets ? `
            <button onclick="startNextSet()" class="start-next-btn">
                <i class="fas fa-play"></i>
                Start Set ${currentSet + 1}
            </button>
        ` : `
            <div class="completion-message" style="margin: 2rem 0; padding: 1.5rem; background: #f8f9fa; border-radius: 15px;">
                <i class="fas fa-trophy" style="font-size: 2rem; color: var(--accent-color); margin-bottom: 1rem;"></i>
                <h3 style="color: var(--primary-color); margin: 0.5rem 0;">All Practice Sets Completed!</h3>
                <p style="color: #666; margin: 0.5rem 0;">You've completed all available practice sets for basic users.</p>
                <a href="payment.html?plan=premium" class="start-next-btn" style="margin-top: 1rem;">
                    <i class="fas fa-crown"></i>
                    Upgrade to Premium
                </a>
            </div>
        `}
        <a href="dashboard.html" class="view-progress">
            <i class="fas fa-chart-line"></i>
            View Practice History
        </a>
    `;

    // Save results to server
    saveResultsToServer(practiceResults);
});

function startNextSet() {
    // Clear previous results
    localStorage.removeItem('practiceResults');
    // Redirect to practice page
    window.location.href = 'practice.html';
}

async function saveResultsToServer(results) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        const response = await fetch('/api/practice/results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(results)
        });

        if (!response.ok) {
            throw new Error('Failed to save results');
        }

        const data = await response.json();
        console.log('Results saved successfully:', data);
    } catch (error) {
        console.error('Error saving results:', error);
    }
} 