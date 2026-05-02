// --- Global Application State ---
let quizData = [];
let userSelections = {}; 
let currentStreak = parseInt(localStorage.getItem('feynmanStreak')) || 0;

// UI Initialization
document.getElementById('streakCounter').innerText = `🔥 ${currentStreak} Mastered`;
document.getElementById('streakCounterMobile').innerText = `🔥 ${currentStreak} Mastered`; // Update Mobile Streak
const startBtn = document.getElementById('startBtn');
const heroSection = document.getElementById('heroSection');
const appSection = document.getElementById('appSection');
const topicInput = document.getElementById('topicInput');
const deconstructBtn = document.getElementById('deconstructBtn');
const submitQuizBtn = document.getElementById('submitQuizBtn');

// --- Mobile Menu Logic ---
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    // Change icon to 'X' when open
    mobileMenuBtn.innerText = mobileMenu.classList.contains('active') ? '✖' : '☰';
});

// Close menu if clicking outside of it
document.addEventListener('click', (event) => {
    if (!mobileMenu.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
        mobileMenu.classList.remove('active');
        mobileMenuBtn.innerText = '☰';
    }
});

// --- Navigation & Routing ---
function goToWorkspace(autoSearchTopic = null) {
    heroSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    document.getElementById('mainFooter').classList.add('hidden'); 
    
    // Close mobile menu if open
    mobileMenu.classList.remove('active');
    mobileMenuBtn.innerText = '☰';
    
    topicInput.focus();
    
    if (autoSearchTopic) {
        topicInput.value = autoSearchTopic;
        deconstructBtn.click();
    }
}

startBtn.addEventListener('click', () => goToWorkspace(null));

// Desktop Home Button
document.getElementById('navHome').addEventListener('click', navigateHome);
// Mobile Home Button
document.getElementById('navHomeMobile').addEventListener('click', navigateHome);

function navigateHome() {
    appSection.classList.add('hidden');
    heroSection.classList.remove('hidden');
    document.getElementById('mainFooter').classList.remove('hidden'); 
    
    // Close mobile menu if open
    mobileMenu.classList.remove('active');
    mobileMenuBtn.innerText = '☰';
}

// Interactive Tag Clicks
document.querySelectorAll('.search-tag').forEach(tag => {
    tag.addEventListener('click', () => goToWorkspace(tag.innerText));
});

// Dummy Auth Popups
document.querySelectorAll('.auth-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        alert("Authentication module coming in V2. Enjoy the beta access!");
        mobileMenu.classList.remove('active');
        mobileMenuBtn.innerText = '☰';
    });
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
                
                btn.onclick = () => {
                    Array.from(optionsDiv.children).forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    userSelections[index] = opt; 
                    
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

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('resultsDashboard').classList.remove('hidden');

    } catch (error) {
        document.getElementById('loading').classList.add('hidden');
        
        let errorMsg = error.message === "Failed to fetch" 
            ? "Cannot connect to backend. Please ensure 'node server.js' is running." 
            : `AI Pipeline Error: ${error.message}`;
            
        document.getElementById('errorBox').innerText = errorMsg;
        document.getElementById('errorBox').classList.remove('hidden');
    }
});

// --- Final Grading & Feedback Logic ---
submitQuizBtn.addEventListener('click', () => {
    let score = 0;
    const total = quizData.length;

    quizData.forEach((q, index) => {
        const optionsDiv = document.getElementById(`options-group-${index}`);
        const userChoice = userSelections[index];
        const correctChoice = q.correct_answer;

        Array.from(optionsDiv.children).forEach(btn => {
            btn.disabled = true; 
            if (btn.innerText === correctChoice) btn.classList.add('correct'); 
            if (btn.innerText === userChoice && userChoice !== correctChoice) btn.classList.add('wrong'); 
        });

        if (userChoice === correctChoice) score++;
    });

    submitQuizBtn.classList.add('hidden'); 
    showDynamicFeedback(score, total); 
});

function showDynamicFeedback(score, total) {
    const block = document.getElementById('motivationBlock');
    const title = document.getElementById('feedbackTitle');
    const text = document.getElementById('feedbackText');
    
    block.className = 'card glass highlight-card fade-in'; 

    if (score === total) {
        block.classList.add('success');
        title.innerText = "🌟 Flawless Victory!";
        text.innerHTML = `<strong>Score: ${score}/${total}.</strong> You are a phenomenal learner. You completely mastered this concept!`;
        
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#00f3ff', '#b026ff', '#ffffff'] });
        
        currentStreak++;
        localStorage.setItem('feynmanStreak', currentStreak);
        document.getElementById('streakCounter').innerText = `🔥 ${currentStreak} Mastered`;
        document.getElementById('streakCounterMobile').innerText = `🔥 ${currentStreak} Mastered`;
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
