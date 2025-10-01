
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
    
    console.log('🌍 Signin Environment Detection:');
    console.log('  - Hostname:', hostname);
    console.log('  - Is Local:', isLocal);
    console.log('  - API URL:', apiUrl);
    
    return apiUrl;
})();

// Enhanced login form handler
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // Basic validation
    if (!email || !password) {
        alert("Please fill in all fields");
        return;
    }

    // Disable form during submission
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Signing in...';

    try {
        console.log('🔐 Attempting login for:', email);
        
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            credentials: 'include', // Important for production CORS
            body: JSON.stringify({ email, password })
        });

        console.log('📡 Login response status:', response.status);

        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error('Failed to parse JSON response:', jsonError);
            throw new Error('Invalid server response');
        }

        if (response.ok && data.token) {
            console.log('✅ Login successful');
            
            // Store token and user data
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // Check if user needs to complete profile
            if (!data.user.nickname) {
                console.log('👤 User needs to complete profile');
                alert("Please complete your profile setup.");
                window.location.href = "onboarding1.html";
            } else {
                console.log('🚀 Redirecting to dashboard');
                alert("Login successful! Redirecting...");
                window.location.href = "dashboard.html";
            }
        } else {
            console.log('❌ Login failed:', data);
            
            // Handle specific error cases
            if (response.status === 400) {
                if (data.msg?.toLowerCase().includes("not found")) {
                    alert("No account found for this email. Redirecting to signup...");
                    window.location.href = "signup.html";
                } else if (data.msg?.toLowerCase().includes("password")) {
                    alert("Incorrect password. Please try again.");
                    document.getElementById("password").focus();
                } else {
                    alert(data.msg || "Login failed. Please check your credentials.");
                }
            } else if (response.status === 403 && data.needsVerification) {
                alert("Please verify your email first.");
                window.location.href = "verify-otp.html?email=" + encodeURIComponent(email);
            } else if (response.status >= 500) {
                alert("Server error. Please try again later.");
            } else {
                alert(data.msg || data.error || "Login failed. Please try again.");
            }
        }
    } catch (error) {
        console.error('💥 Login error:', error);
        
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            alert("Cannot connect to server. Please check your internet connection and try again.");
        } else {
            alert("Login failed: " + error.message);
        }
    } finally {
        // Re-enable form
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
});

// Password toggle functionality
function togglePassword() {
    const passwordField = document.getElementById("password");
    const toggleIcon = document.querySelector('.toggle-icon');
    
    if (passwordField.type === "password") {
        passwordField.type = "text";
        toggleIcon.textContent = "🙈";
    } else {
        passwordField.type = "password";
        toggleIcon.textContent = "👁️";
    }
}

// Google OAuth redirect
function redirectGoogle() {
    console.log('🔗 Redirecting to Google OAuth');
    const googleAuthURL = `${API_URL.replace('/api/auth', '')}/api/auth/google`;
    console.log('Google Auth URL:', googleAuthURL);
    window.location.href = googleAuthURL;
}

// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        console.log('👤 User already has token, checking validity...');
        
        // Verify token is still valid
        fetch(`${API_URL}/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        })
        .then(response => {
            if (response.ok) {
                console.log('✅ Token still valid, redirecting to dashboard');
                window.location.href = 'dashboard.html';
            } else {
                console.log('❌ Token expired, removing from storage');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        })
        .catch(error => {
            console.log('⚠️ Token check failed:', error.message);
            // Don't remove token on network errors
        });
    }
});