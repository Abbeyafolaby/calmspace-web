const API_URL = "https://calmspace-api.onrender.com/api/auth" ;

document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname: fullName, email, password }),
        });

        const data = await res.json();

        if (res.ok) {
        // Save email in localStorage for OTP verification
        localStorage.setItem("pendingEmail", email);
        alert("Registration successful! Check your email for the OTP.");
        window.location.href = "verify-otp.html";  // redirect to OTP page
        } else {
        alert(data.error || "Something went wrong");
        }
    } catch (err) {
        console.error(err);
        alert("Network error");
    }
});
