const API_URL = "https://calmspace-api.onrender.com/api/auth" ;


document.getElementById("otpForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const otp = document.getElementById("otp").value;
    const email = localStorage.getItem("pendingEmail");

    if (!email) {
        alert("No pending email found. Please register again.");
        window.location.href = "register.html";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
        });

        const data = await res.json();

    if (res.ok) {
    alert("Account verified successfully!");
    localStorage.removeItem("pendingEmail");
    // Save verified email for onboarding
    localStorage.setItem("verifiedEmail", email);
    window.location.href = "onboarding1.html"; 
    } else {
        alert(data.error || "Invalid OTP. Try again.");
        }
    } catch (err) {
        console.error(err);
        alert("Network error");
    }
});
