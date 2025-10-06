// API URL Configuration
const API_URL = (() => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    const isLocal = hostname === 'localhost' || 
                   hostname === '127.0.0.1' || 
                   hostname === '0.0.0.0' ||
                   hostname.startsWith('192.168.') ||
                   hostname.endsWith('.local') ||
                   protocol === 'file:';
    
    return isLocal 
        ? "http://localhost:5000/api/auth"  
        : "https://calmspace-api.onrender.com/api/auth";
})();

// Token Management
const TokenManager = {
    get: () => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        
        if (urlToken) {
            localStorage.setItem('token', urlToken);
            TokenManager.clearTokenFromURL();
            return urlToken;
        }
        
        return localStorage.getItem('token');
    },
    
    set: (token) => {
        if (token) {
            localStorage.setItem('token', token);
        }
    },
    
    remove: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
    
    clearTokenFromURL: () => {
        if (window.location.search.includes('token=')) {
            const url = new URL(window.location);
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url.pathname);
        }
    }
};

// Make Authenticated API Request
const makeAuthenticatedRequest = async (endpoint, options = {}) => {
    const token = TokenManager.get();
    
    if (!token) {
        throw new Error('NO_TOKEN');
    }
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'include'
    };
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    const fullUrl = `${API_URL}${endpoint}`;
    
    try {
        const response = await fetch(fullUrl, finalOptions);
        
        if (!response.ok) {
            let errorData;
            const contentType = response.headers.get('content-type');
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    errorData = await response.json();
                } else {
                    errorData = { message: await response.text() };
                }
            } catch (e) {
                errorData = { message: `HTTP ${response.status} - ${response.statusText}` };
            }
            
            if (response.status === 401) {
                TokenManager.remove();
                throw new Error('UNAUTHORIZED');
            } else if (response.status === 403) {
                throw new Error('FORBIDDEN');
            } else if (response.status === 404) {
                throw new Error('NOT_FOUND');
            } else if (response.status >= 500) {
                throw new Error('SERVER_ERROR');
            }
            
            throw new Error(errorData.message || errorData.msg || `Request failed: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('NETWORK_ERROR');
        }
        throw error;
    }
};

// Update user display (name and avatar)
const updateUserDisplay = (userData) => {
    // Update greeting with nickname
    const greetingElement = document.querySelector('.greeting');
    if (greetingElement && userData.nickname) {
        greetingElement.textContent = `Hello ${userData.nickname}!`;
    }
    
    // Update avatar with first letter of nickname
    const avatarElement = document.querySelector('.avatar');
    if (avatarElement && userData.nickname) {
        const firstLetter = userData.nickname.charAt(0).toUpperCase();
        avatarElement.textContent = firstLetter;
    }
};

// Authenticate User
const authenticateUser = async () => {
    try {
        const token = TokenManager.get();
        
        if (!token) {
            throw new Error('NO_TOKEN');
        }
        
        const userData = await makeAuthenticatedRequest('/me');
        
        // Update user display (greeting and avatar)
        updateUserDisplay(userData);
        
        localStorage.setItem('user', JSON.stringify(userData));
        
        return userData;
        
    } catch (error) {
        // Handle different error types
        switch (error.message) {
            case 'NO_TOKEN':
                alert('No authentication token found. Please sign in.');
                break;
            case 'UNAUTHORIZED':
                alert('Your session has expired. Please sign in again.');
                break;
            case 'NOT_FOUND':
                alert('User account not found. Please sign in again.');
                TokenManager.remove();
                break;
            case 'NETWORK_ERROR':
                const cachedUser = localStorage.getItem('user');
                if (cachedUser) {
                    const userData = JSON.parse(cachedUser);
                    updateUserDisplay(userData);
                    showNetworkWarning();
                    return userData;
                }
                alert('Cannot connect to server. Please check your internet connection.');
                break;
            default:
                alert(`Authentication error: ${error.message}`);
                TokenManager.remove();
        }
        
        window.location.href = 'signin.html';
        throw error;
    }
};

// Show network warning
const showNetworkWarning = () => {
    const warning = document.createElement('div');
    warning.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #ff6b6b;
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    warning.textContent = 'Network issues detected. Some features may not work properly.';
    document.body.appendChild(warning);
    
    setTimeout(() => {
        if (document.body.contains(warning)) {
            document.body.removeChild(warning);
        }
    }, 5000);
};

// Handle Logout
const handleLogout = async () => {
    const token = TokenManager.get();
    TokenManager.remove();
    
    try {
        if (token) {
            await makeAuthenticatedRequest('/logout', { method: 'POST' });
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    window.location.href = 'signin.html';
};

// Dashboard UI Data
const quotes = [
    { text: '"Rest is not weakness, it\'s renewal."', author: 'Reframes rest as a form of...' },
    { text: '"Progress, not perfection."', author: 'Embracing the journey of growth...' },
    { text: '"You are stronger than you think."', author: 'Building inner resilience...' },
    { text: '"One day at a time."', author: 'The power of present moment...' }
];

const reflections = [
    { question: 'What three things am I grateful for today?', time: '8 minutes' },
    { question: 'What emotion stood out the most for today?', time: '5 minutes' },
    { question: 'What is one small win I achieved today?', time: '3 minutes' }
];

const schedule = [
    { title: 'Breathing exercise', time: '30 minutes' },
    { title: 'Yoga', time: '45 minutes' },
    { title: 'Music listening', time: '20 minutes' },
    { title: 'Meditation session', time: '15 minutes' }
];

const sessions = [
    { 
        title: 'Breathe Away Stress', 
        author: 'by Isabella Thompson', 
        duration: 352,
        audioUrl: 'https://living-jade-ktakggbrow.edgeone.app/calm-yoga-lofi-peaceful-meditation-beat-247403%20(online-audio-converter.com).mp3'
    },
    { 
        title: 'Drift Into Sleep', 
        author: 'by Amani Okafor', 
        duration: 186,
        audioUrl: 'https://operational-yellow-pzor5q1akr.edgeone.app/slowlife.mp3'
    },
    { 
        title: 'Morning Clarity', 
        author: 'by Sofia Garcia', 
        duration: 240,
        audioUrl: 'https://orthodox-scarlet-fur8jrr6ac.edgeone.app/embracingthesky.mp3'
    },
    { 
        title: 'Quiet the Mind', 
        author: 'by James Liu', 
        duration: 330,
        audioUrl: 'https://related-silver-ur8kqpycwe.edgeone.app/inspire.mp3'
    },
    { 
        title: 'Finding Your Calm Routine', 
        author: 'by Maria Santos', 
        duration: 300,
        audioUrl: 'https://operational-yellow-pzor5q1akr.edgeone.app/slowlife.mp3'
    },
    { 
        title: 'From Anxious to Aware', 
        author: 'by Monifa Robson', 
        duration: 420,
        audioUrl: 'https://orthodox-scarlet-fur8jrr6ac.edgeone.app/embracingthesky.mp3'
    }
];

// Calendar variables
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentDay = new Date().getDate();
let currentAudio = null;
let currentPlayingIndex = -1;

// Format time helper
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Initialize reflection list
function initReflections() {
    const list = document.getElementById('reflectionList');
    if (!list) return;
    
    reflections.forEach(item => {
        list.innerHTML += `
            <div class="reflection-item">
                <div class="reflection-question">${item.question}</div>
                <div class="reflection-time">${item.time}</div>
            </div>
        `;
    });
}

// Initialize schedule list
function initSchedule() {
    const list = document.getElementById('scheduleList');
    if (!list) return;
    
    schedule.forEach(item => {
        list.innerHTML += `
            <div class="schedule-item" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div class="schedule-title">${item.title}</div>
                    <div class="schedule-time">${item.time}</div>
                </div>
                <button class="menu-dots">⋯</button>
            </div>
        `;
    });
}

// Initialize sessions list with audio functionality
function initSessions() {
    const list = document.getElementById('sessionsList');
    if (!list) return;
    
    sessions.forEach((item, index) => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'session-item';
        sessionDiv.innerHTML = `
            <div class="session-info">
                <h4>${item.title}</h4>
                <div class="session-author">${item.author}</div>
                <div class="progress-bar" data-index="${index}">
                    <div class="progress-fill" id="progress-${index}"></div>
                </div>
            </div>
            <div class="session-controls">
                <div class="session-time-display">
                    <span class="time-current" id="current-${index}">0:00</span>
                    <span class="time-total">${formatTime(item.duration)}</span>
                </div>
                <button class="play-btn" data-index="${index}">▶</button>
            </div>
        `;
        list.appendChild(sessionDiv);
    });

    // Add event listeners
    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', handlePlayPause);
    });

    document.querySelectorAll('.progress-bar').forEach(bar => {
        bar.addEventListener('click', handleProgressClick);
    });
}

// Handle play/pause
function handlePlayPause(e) {
    const index = parseInt(e.target.dataset.index);
    const btn = e.target;

    if (currentPlayingIndex === index && currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        btn.textContent = '▶';
        btn.classList.remove('playing');
        return;
    }

    if (currentAudio) {
        currentAudio.pause();
        if (currentPlayingIndex >= 0) {
            const oldBtn = document.querySelector(`.play-btn[data-index="${currentPlayingIndex}"]`);
            if (oldBtn) {
                oldBtn.textContent = '▶';
                oldBtn.classList.remove('playing');
            }
        }
    }

    if (currentPlayingIndex !== index) {
        currentAudio = new Audio(sessions[index].audioUrl);
        currentAudio.addEventListener('loadedmetadata', () => {
            sessions[index].duration = currentAudio.duration;
            const totalTimeEl = document.querySelector(`#current-${index}`).nextElementSibling;
            if (totalTimeEl) {
                totalTimeEl.textContent = formatTime(currentAudio.duration);
            }
        });
    }

    currentPlayingIndex = index;
    currentAudio.play();
    btn.textContent = '⏸';
    btn.classList.add('playing');

    currentAudio.addEventListener('timeupdate', () => {
        updateProgress(index);
    });

    currentAudio.addEventListener('ended', () => {
        btn.textContent = '▶';
        btn.classList.remove('playing');
        document.getElementById(`progress-${index}`).style.width = '0%';
        document.getElementById(`current-${index}`).textContent = '0:00';
    });
}

// Update progress bar and time
function updateProgress(index) {
    if (currentAudio) {
        const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
        document.getElementById(`progress-${index}`).style.width = progress + '%';
        document.getElementById(`current-${index}`).textContent = formatTime(currentAudio.currentTime);
    }
}

// Handle progress bar click (seek)
function handleProgressClick(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    
    if (currentPlayingIndex === index && currentAudio) {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        currentAudio.currentTime = percentage * currentAudio.duration;
    }
}

// Change quote
let currentQuoteIndex = 0;
window.changeQuote = function() {
    currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
    const quote = quotes[currentQuoteIndex];
    const quoteTextEl = document.querySelector('.quote-text');
    const quoteAuthorEl = document.querySelector('.quote-author');
    if (quoteTextEl) quoteTextEl.textContent = quote.text;
    if (quoteAuthorEl) quoteAuthorEl.textContent = quote.author;
};

// Activity Chart
function drawActivityChart() {
    const canvas = document.getElementById('activityChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const data = [
        { day: 'Mon', values: [15, 20, 5, 10, 8, 12] },
        { day: 'Tue', values: [25, 15, 10, 5, 15, 10] },
        { day: 'Wed', values: [20, 10, 8, 12, 20, 15] },
        { day: 'Thu', values: [10, 25, 15, 8, 12, 18] },
        { day: 'Fri', values: [30, 20, 12, 15, 10, 8] },
        { day: 'Sat', values: [25, 15, 20, 10, 12, 15] },
        { day: 'Sun', values: [20, 18, 15, 12, 10, 8] }
    ];

    const colors = ['#667eea', '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'];
    const barWidth = canvas.width / (data.length * 2);
    const maxValue = 60;

    data.forEach((day, i) => {
        const x = i * (canvas.width / data.length) + barWidth;
        let yOffset = canvas.height - 40;

        day.values.forEach((value, j) => {
            const height = (value / maxValue) * (canvas.height - 50);
            ctx.fillStyle = colors[j];
            ctx.fillRect(x, yOffset - height, barWidth * 0.8, height);
            yOffset -= height;
        });

        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(day.day, x + barWidth * 0.4, canvas.height - 10);
    });
}

// Mood Chart
function drawMoodChart() {
    const canvas = document.getElementById('moodChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const data = [3, 4, 3.5, 4.5, 4, 3.5, 4, 4.5, 3, 3.5, 4, 4.2, 3.8, 4, 4.3];
    const points = [];

    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((value, i) => {
        const x = (i / (data.length - 1)) * canvas.width;
        const y = canvas.height - (value / 5) * canvas.height;
        points.push({ x, y });

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.stroke();

    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
    ctx.fill();

    points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#4CAF50';
        ctx.fill();
    });
}

// Calendar functions
function generateCalendar() {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    
    calendar.innerHTML = '';

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    
    const calendarMonthEl = document.getElementById('calendarMonth');
    if (calendarMonthEl) {
        calendarMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }

    const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendar.appendChild(header);
    });

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = daysInPrevMonth - i;
        calendar.appendChild(day);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        day.textContent = i;
        
        const todayDate = new Date();
        if (i === todayDate.getDate() && 
            currentMonth === todayDate.getMonth() && 
            currentYear === todayDate.getFullYear()) {
            day.classList.add('selected');
        }
        
        calendar.appendChild(day);
    }
}

window.changeMonth = function(delta) {
    currentMonth += delta;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    generateCalendar();
};

window.changeMoodView = function(view) {
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
};

window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('active');
};

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const menu = document.getElementById('mobileMenu');
    const menuBtn = document.querySelector('.menu-btn');
    
    if (menu && menu.classList.contains('active')) {
        if (!menu.contains(event.target) && !menuBtn.contains(event.target)) {
            menu.classList.remove('active');
        }
    }
});

// Initialize all dashboard UI components
const initializeDashboardUI = () => {
    initReflections();
    initSchedule();
    initSessions();
    drawActivityChart();
    drawMoodChart();
    generateCalendar();
};

// Resize handler
window.addEventListener('resize', () => {
    drawActivityChart();
    drawMoodChart();
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Initialize dashboard UI components
        initializeDashboardUI();
        
        // Authenticate user and update display
        await authenticateUser();
        
        // Attach logout handler
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", (e) => {
                e.preventDefault();
                handleLogout();
            });
        }
        
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
    }
});