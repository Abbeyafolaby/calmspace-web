const API_URL = "https://calmspace-api.onrender.com/api/auth" ;

// Handle token from Google OAuth redirect
document.addEventListener('DOMContentLoaded', function() {
    // Extract token from URL (for Google OAuth users)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        // Store token for API calls
        localStorage.setItem('token', token);
        // Clear token from URL for security
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

document.getElementById("continueBtn").addEventListener("click", async (e) => {
    e.preventDefault();

    const nickname = document.getElementById("nickname").value.trim();
    
    // Check for email from regular registration flow
    let email = localStorage.getItem("verifiedEmail");
    
    // If no email from regular flow, check if we have a token (Google OAuth user)
    const token = localStorage.getItem("token");
    
    if (!nickname) {
        alert("Please enter a nickname");
        return;
    }

    try {
        let res, data;
        
        if (email) {
            // Regular user flow - use email from localStorage
            res = await fetch(`${API_URL}/complete-profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, nickname }),
            });
        } else if (token) {
            // Google OAuth user flow - get user info from token
            // First, get user info using the token
            const userRes = await fetch(`${API_URL}/me`, {
                method: "GET",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                },
            });
            
            if (!userRes.ok) {
                alert("Authentication error. Please sign in again.");
                window.location.href = "signin.html";
                return;
            }
            
            const userData = await userRes.json();
            email = userData.email;
            
            // Now complete the profile
            res = await fetch(`${API_URL}/complete-profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, nickname }),
            });
        } else {
            alert("No verified user found. Please register again.");
            window.location.href = "signup.html";
            return;
        }

        data = await res.json();

        if (res.ok) {
            alert("Profile completed successfully!");
            
            // Clean up localStorage
            localStorage.removeItem("verifiedEmail");
            
            // For Google OAuth users, keep the token for the next page
            // For regular users, they'll need to login
            
            window.location.href = "onboarding2.html"; 
        } else {
            alert(data.error || "Something went wrong");
        }
    } catch (err) {
        console.error(err);
        alert("Network error");
    }
});