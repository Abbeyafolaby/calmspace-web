// Debug logger that persists across redirects
const DebugLogger = {
    logs: [],
    
    log: function(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, data };
        this.logs.push(logEntry);
        console.log(`[${timestamp}] ${message}`, data || '');
        
        // Save to localStorage for persistence
        try {
            const existingLogs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
            existingLogs.push(logEntry);
            // Keep only last 50 logs
            if (existingLogs.length > 50) existingLogs.shift();
            localStorage.setItem('debug_logs', JSON.stringify(existingLogs));
        } catch(e) {
            console.error('Failed to save debug log:', e);
        }
    },
    
    showLogs: function() {
        try {
            const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
            console.table(logs);
            return logs;
        } catch(e) {
            console.error('Failed to retrieve logs:', e);
            return [];
        }
    },
    
    clearLogs: function() {
        localStorage.removeItem('debug_logs');
        this.logs = [];
        console.log('Debug logs cleared');
    }
};

// Make it globally accessible for debugging in console
window.DebugLogger = DebugLogger;

DebugLogger.log('Dashboard script loaded');

const API_URL = (() => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    const isLocal = hostname === 'localhost' || 
                   hostname === '127.0.0.1' || 
                   hostname === '0.0.0.0' ||
                   hostname.startsWith('192.168.') ||
                   hostname.endsWith('.local') ||
                   protocol === 'file:';
    
    const apiUrl = isLocal 
        ? "http://localhost:5000/api/auth"  
        : "https://calmspace-api.onrender.com/api/auth";
    
    DebugLogger.log('Environment Detection', {
        hostname,
        protocol,
        isLocal,
        apiUrl
    });
    
    return apiUrl;
})();

const TokenManager = {
    get: () => {
        DebugLogger.log('TokenManager.get() called');
        
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        
        if (urlToken) {
            DebugLogger.log('Token found in URL', { tokenLength: urlToken.length });
            localStorage.setItem('token', urlToken);
            TokenManager.clearTokenFromURL();
            return urlToken;
        }
        
        const storageToken = localStorage.getItem('token');
        DebugLogger.log('Token from localStorage', { 
            found: !!storageToken,
            tokenLength: storageToken ? storageToken.length : 0
        });
        return storageToken;
    },
    
    set: (token) => {
        if (token) {
            localStorage.setItem('token', token);
            DebugLogger.log('Token saved to localStorage', { tokenLength: token.length });
        }
    },
    
    remove: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        DebugLogger.log('Token removed from localStorage');
    },
    
    clearTokenFromURL: () => {
        if (window.location.search.includes('token=')) {
            const url = new URL(window.location);
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url.pathname);
            DebugLogger.log('Token cleared from URL');
        }
    }
};

const makeAuthenticatedRequest = async (endpoint, options = {}) => {
    DebugLogger.log('Making authenticated request', { endpoint });
    
    const token = TokenManager.get();
    
    if (!token) {
        DebugLogger.log('ERROR: No token available');
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
    DebugLogger.log('Request URL', { fullUrl });
    
    try {
        const response = await fetch(fullUrl, finalOptions);
        
        DebugLogger.log('Response received', { 
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
        });
        
        if (!response.ok) {
            let errorData;
            const contentType = response.headers.get('content-type');
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    errorData = await response.json();
                } else {
                    errorData = { message: await response.text() };
                }
                DebugLogger.log('Error response data', errorData);
            } catch (e) {
                errorData = { message: `HTTP ${response.status} - ${response.statusText}` };
                DebugLogger.log('Failed to parse error response', { error: e.message });
            }
            
            if (response.status === 401) {
                DebugLogger.log('UNAUTHORIZED - removing token');
                TokenManager.remove();
                throw new Error('UNAUTHORIZED');
            } else if (response.status === 403) {
                DebugLogger.log('FORBIDDEN');
                throw new Error('FORBIDDEN');
            } else if (response.status === 404) {
                DebugLogger.log('NOT_FOUND');
                throw new Error('NOT_FOUND');
            } else if (response.status >= 500) {
                DebugLogger.log('SERVER_ERROR');
                throw new Error('SERVER_ERROR');
            }
            
            throw new Error(errorData.message || errorData.msg || `Request failed: ${response.status}`);
        }
        
        const data = await response.json();
        DebugLogger.log('Request successful', { dataKeys: Object.keys(data) });
        return data;
        
    } catch (error) {
        DebugLogger.log('Request failed with exception', { 
            errorName: error.name,
            errorMessage: error.message
        });
        
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            DebugLogger.log('NETWORK_ERROR detected');
            throw new Error('NETWORK_ERROR');
        }
        
        throw error;
    }
};

const authenticateUser = async () => {
    DebugLogger.log('=== AUTHENTICATION CHECK STARTED ===');
    
    try {
        const token = TokenManager.get();
        
        if (!token) {
            DebugLogger.log('CRITICAL: No token found - will redirect to signin');
            throw new Error('NO_TOKEN');
        }
        
        DebugLogger.log('Token exists, verifying with server...');
        
        const userData = await makeAuthenticatedRequest('/me');
        
        DebugLogger.log('Authentication successful', {
            userId: userData.id,
            email: userData.email,
            nickname: userData.nickname
        });
        
        const nicknameElement = document.getElementById('userNickname');
        if (nicknameElement && userData.nickname) {
            nicknameElement.textContent = userData.nickname;
            DebugLogger.log('UI updated with nickname');
        }
        
        localStorage.setItem('user', JSON.stringify(userData));
        DebugLogger.log('=== AUTHENTICATION CHECK COMPLETED ===');
        
        return userData;
        
    } catch (error) {
        DebugLogger.log('AUTHENTICATION FAILED', { error: error.message });
        
        // Don't redirect immediately - give time to see logs
        const shouldRedirect = confirm(
            `Authentication failed: ${error.message}\n\n` +
            `Click OK to redirect to signin.\n` +
            `Click Cancel to stay and check console logs.\n\n` +
            `To view debug logs, open console and type: DebugLogger.showLogs()`
        );
        
        if (!shouldRedirect) {
            DebugLogger.log('User chose to stay - showing logs');
            console.log('=== DEBUG LOGS ===');
            DebugLogger.showLogs();
            throw error; // Don't redirect
        }
        
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
                    DebugLogger.log('Using cached user data due to network error');
                    const userData = JSON.parse(cachedUser);
                    const nicknameElement = document.getElementById('userNickname');
                    if (nicknameElement && userData.nickname) {
                        nicknameElement.textContent = userData.nickname;
                    }
                    showNetworkWarning();
                    return userData;
                }
                alert('Cannot connect to server. Please check your internet connection.');
                break;
            default:
                alert(`Authentication error: ${error.message}`);
                TokenManager.remove();
        }
        
        DebugLogger.log('Redirecting to signin page');
        window.location.href = 'signin.html';
        throw error;
    }
};

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

const initializeCharts = () => {
    DebugLogger.log('Initializing charts...');
    try {
        const activityChart = document.getElementById("activityChart");
        const moodChart = document.getElementById("moodChart");

        if (activityChart && typeof Chart !== 'undefined') {
            new Chart(activityChart, {
                type: "bubble",
                data: {
                    datasets: [{
                        label: "Weekly Activities",
                        data: [
                            {x: 1, y: 20, r: 10},
                            {x: 2, y: 30, r: 12},
                            {x: 3, y: 25, r: 14},
                            {x: 4, y: 60, r: 18},
                            {x: 5, y: 45, r: 15},
                            {x: 6, y: 40, r: 16}
                        ],
                        backgroundColor: "#8bcba7"
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            ticks: {
                                callback: value => ["","Yoga","Journaling","Breathing","Music","Sound Therapy","Mood Tracking"][value]
                            },
                            grid: { drawOnChartArea: false }
                        },
                        y: {
                            beginAtZero: true,
                            max: 70,
                            title: { display: true, text: "Minutes" }
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
            DebugLogger.log('Activity chart initialized');
        }

        if (moodChart && typeof Chart !== 'undefined') {
            new Chart(moodChart, {
                type: "line",
                data: {
                    labels: ["Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan"],
                    datasets: [{
                        label: "Mood Level",
                        data: [3,4,3,5,4,6,5,6,5,7,6,8],
                        borderColor: "#8bcba7",
                        backgroundColor: "rgba(139,203,167,0.2)",
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointBackgroundColor: "#8bcba7"
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            min: 1,
                            max: 5,
                            ticks: {
                                stepSize: 1,
                                callback: value => ["😡","😕","🙂","😀","😄"][value-1]
                            }
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
            DebugLogger.log('Mood chart initialized');
        }
    } catch (error) {
        DebugLogger.log('Chart initialization error', { error: error.message });
    }
};

const handleLogout = async () => {
    DebugLogger.log('Logout initiated');
    
    const token = TokenManager.get();
    TokenManager.remove();
    
    try {
        if (token) {
            await makeAuthenticatedRequest('/logout', { method: 'POST' });
            DebugLogger.log('Backend logout successful');
        }
    } catch (error) {
        DebugLogger.log('Backend logout failed (non-critical)', { error: error.message });
    }
    
    window.location.href = 'signin.html';
};

const initializeMenuToggle = () => {
    const menuToggle = document.getElementById("menuToggle");
    const menuList = document.getElementById("menuList");

    if (menuToggle && menuList) {
        menuToggle.addEventListener("click", () => {
            menuList.classList.toggle("show");
        });
        DebugLogger.log('Menu toggle initialized');
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    DebugLogger.log('=== DASHBOARD INITIALIZATION STARTED ===');
    DebugLogger.log('Current URL', { url: window.location.href });
    
    try {
        initializeMenuToggle();
        
        if (typeof Chart !== 'undefined') {
            initializeCharts();
        } else {
            DebugLogger.log('Chart.js not loaded');
        }
        
        await authenticateUser();
        
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", (e) => {
                e.preventDefault();
                handleLogout();
            });
            DebugLogger.log('Logout handler attached');
        }
        
        DebugLogger.log('=== DASHBOARD INITIALIZATION COMPLETED ===');
        
    } catch (error) {
        DebugLogger.log('Dashboard initialization failed', { error: error.message });
    }
});

// Prevent redirect loop by showing alert
let redirectCount = parseInt(sessionStorage.getItem('redirectCount') || '0');
if (redirectCount > 2) {
    DebugLogger.log('REDIRECT LOOP DETECTED', { count: redirectCount });
    alert('Redirect loop detected! Check console logs: DebugLogger.showLogs()');
    sessionStorage.setItem('redirectCount', '0');
} else {
    sessionStorage.setItem('redirectCount', (redirectCount + 1).toString());
}

// Clear redirect count on successful load
window.addEventListener('load', () => {
    setTimeout(() => {
        sessionStorage.setItem('redirectCount', '0');
    }, 2000);
});