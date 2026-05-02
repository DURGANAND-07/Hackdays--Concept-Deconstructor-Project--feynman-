// --- Global Application State ---
let quizData = [];
let userSelections = {}; 
let currentStreak = parseInt(localStorage.getItem('feynmanStreak')) || 0;

// UI Initialization
document.getElementById('streakCounter').innerText = `🔥 ${currentStreak} Mastered`;
const startBtn = document.getElementById('startBtn');
const heroSection = document.getElementById('heroSection');
const appSection = document.getElementById('appSection');
const topicInput = document.getElementById('topicInput');
const deconstructBtn = document.getElementById('deconstructBtn');
const submitQuizBtn = document.getElementById('submitQuizBtn');

// --- Navigation & Routing ---
function goToWorkspace(autoSearchTopic = null) {
    heroSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    document.getElementById('mainFooter').classList.add('hidden'); // Hide footer in workspace
    topicInput.focus();
    
    if (autoSearchTopic) {
        topicInput.value = autoSearchTopic;
        deconstructBtn.click();
    }
}

startBtn.addEventListener('click', () => goToWorkspace(null));

document.getElementById('navHome').addEventListener('click', () => {
    appSection.classList.add('hidden');
    heroSection.classList.remove('hidden');
    document.getElementById('mainFooter').classList.remove('hidden'); // Show footer on home
});

// Interactive Tag Clicks
document.querySelectorAll('.search-tag').forEach(tag => {
    tag.addEventListener('click', () => goToWorkspace(tag.innerText));
});

// Dummy Auth Popups
document.querySelectorAll('.auth-btn').forEach(btn => {
    btn.addEventListener('click', () => alert("Authentication module coming in V2. Enjoy the beta access!"));
});

// --- Utility Functions ---
window.copyText = function(elementId) {
    navigator.clipboard.writeText(document.getElementById(elementId).innerText);
    alert('Copied to clipboard!');
}
window.shareChallenge = function() {
    const url = `${window.location.origin}?topic=${encodeURIComponent(topicInput.value)}`;
    navigator.clipboard.writeText(`I just deconstructed ${topicInput.value}. Beat my score: ${url}`);
    alert('Challenge link copied to clipboard!');
}

// Trigger search on "Enter"
topicInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') deconstructBtn.click(); });

// --- Core API & Rendering Logic ---
deconstructBtn.addEventListener('click', async () => {
    const topic = topicInput.value.trim();
    if (!topic) return;

    // 1. Reset UI State
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('resultsDashboard').classList.add('hidden');
    document.getElementById('motivationBlock').classList.add('hidden');
    document.getElementById('submitContainer').classList.add('hidden');
    document.getElementById('errorBox').classList.add('hidden');
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.innerHTML = ''; 
    userSelections = {}; 

    try {
        // 2. Fetch Data from local Node.js Server
        const response = await fetch('/api/deconstruct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // 3. Render Markdown
        document.getElementById('analogyText').innerHTML = marked.parse(data.simple_analogy);
        document.getElementById('conceptText').innerHTML = marked.parse(data.core_concept);

        // 4. Build Interactive Quiz
        quizData = data.quiz; 
        
        quizData.forEach((q, index) => {
            const qDiv = document.createElement('div');
            qDiv.className = 'quiz-question-block';
            
            // Set Difficulty Badge Colors
            let diffClass = q.difficulty.toLowerCase() === 'hard' ? 'diff-hard' : 
                            q.difficulty.toLowerCase() === 'medium' ? 'diff-medium' : 'diff-easy';

            qDiv.innerHTML = `<p style="margin-bottom:12px; font-weight:bold; color: #fff; font-size: 1.05rem;">
                                Q${index + 1}: ${q.question} 
                                <span class="difficulty-badge ${diffClass}">${q.difficulty}</span>
                              </p>`;
            
            const optionsDiv = document.createElement('div');
            optionsDiv.id = `options-group-${index}`;

            q.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'quiz-option';
                btn.innerText = opt;
                
                // Track Selections (No immediate grading)
                btn.onclick = () => {
                    Array.from(optionsDiv.children).forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    userSelections[index] = opt; // Save the answer
                    
                    // Show "Submit" button only if ALL questions have a selection
                    if(Object.keys(userSelections).length === quizData.length) {
                        document.getElementById('submitContainer').classList.remove('hidden');
                    }
                };
                optionsDiv.appendChild(btn);
            });
            qDiv.appendChild(optionsDiv);
            quizContainer.appendChild(qDiv);
            if(index < quizData.length -1) quizContainer.appendChild(document.createElement('hr'));
        });

        // 5. Reveal Dashboard
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('resultsDashboard').classList.remove('hidden');

    } catch (error) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('errorBox').innerText = "Intelligence pipeline failed. Please ensure the backend server is running.";
        document.getElementById('errorBox').classList.remove('hidden');
    }
});

// --- Final Grading & Feedback Logic ---
submitQuizBtn.addEventListener('click', () => {
    let score = 0;
    const total = quizData.length;

    // Iterate through data to grade user's choices
    quizData.forEach((q, index) => {
        const optionsDiv = document.getElementById(`options-group-${index}`);
        const userChoice = userSelections[index];
        const correctChoice = q.correct_answer;

        Array.from(optionsDiv.children).forEach(btn => {
            btn.disabled = true; // Lock all buttons
            
            // Highlight correct answer
            if (btn.innerText === correctChoice) {
                btn.classList.add('correct'); 
            }
            // Highlight user's wrong answer
            if (btn.innerText === userChoice && userChoice !== correctChoice) {
                btn.classList.add('wrong'); 
            }
        });

        if (userChoice === correctChoice) score++;
    });

    submitQuizBtn.classList.add('hidden'); // Remove submit button
    showDynamicFeedback(score, total); // Trigger UI Feedback
});

// Dynamic State Changes
function showDynamicFeedback(score, total) {
    const block = document.getElementById('motivationBlock');
    const title = document.getElementById('feedbackTitle');
    const text = document.getElementById('feedbackText');
    
    // Reset any old styling
    block.className = 'card glass highlight-card fade-in'; 

    if (score === total) {
        block.classList.add('success');
        title.innerText = "🌟 Flawless Victory!";
        text.innerHTML = `<strong>Score: ${score}/${total}.</strong> You are a phenomenal learner. You completely mastered this concept!`;
        
        // Dopamine Hit
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#00f3ff', '#b026ff', '#ffffff'] });
        
        // Update Local Storage Streak
        currentStreak++;
        localStorage.setItem('feynmanStreak', currentStreak);
        document.getElementById('streakCounter').innerText = `🔥 ${currentStreak} Mastered`;
    } 
    else if (score > 0) {
        block.classList.add('warning');
        title.innerText = "📈 Good Effort!";
        text.innerHTML = `<strong>Score: ${score}/${total}.</strong> You've got the basics down. Review the Scholar View to patch up the missing pieces.`;
    } 
    else {
        block.classList.add('danger');
        title.innerText = "🛠️ Learning Opportunity!";
        text.innerHTML = `<strong>Score: ${score}/${total}.</strong> That was a tough one. Don't give up! Reread the 5-Year-Old analogy and try to connect the dots again.`;
    }

    block.classList.remove('hidden');
}