import { auth } from "./firebase.js";
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	onAuthStateChanged,
	signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
	// Grab elements safely
	const emailInput = document.getElementById("emailInput");
	const passwordInput = document.getElementById("passwordInput");
	const signupBtn = document.getElementById("signupBtn");
	const loginBtn = document.getElementById("loginBtn");
	const logoutBtn = document.getElementById("logoutBtn");
	const getStartedBtn = document.getElementById("getStartedBtn");
	const status = document.getElementById("status");
	const userEmailEl = document.getElementById("userEmail");

	// Sign Up
	if (signupBtn && emailInput && passwordInput && status) {
		signupBtn.addEventListener("click", async () => {
			try {
				await createUserWithEmailAndPassword(
					auth,
					emailInput.value,
					passwordInput.value
				);
				status.textContent = "Account created!";
			} catch (error) {
				status.textContent = error.message;
			}
		});
	}

	// Login
	if (loginBtn && emailInput && passwordInput && status) {
		loginBtn.addEventListener("click", async () => {
			try {
				await signInWithEmailAndPassword(
					auth,
					emailInput.value,
					passwordInput.value
				);
				status.textContent = "Logged in!";
			} catch (error) {
				status.textContent = error.message;
			}
		});
	}

	// Logout
	if (logoutBtn) {
		logoutBtn.addEventListener("click", async () => {
			await signOut(auth);
			window.location.href = "login.html"; // redirect to login after logout
		});
	}

	// Track auth state
	onAuthStateChanged(auth, (user) => {
		if (user) {
			// Display user email if element exists
			if (userEmailEl) {
				if (userEmailEl)
					userEmailEl.textContent = `Logged in as: ${user.email}`;
			}

			// Show/hide buttons if they exist
			if (logoutBtn) logoutBtn.style.display = "block";
			if (signupBtn) signupBtn.style.display = "none";
			if (loginBtn) loginBtn.style.display = "none";
			if (getStartedBtn) getStartedBtn.style.display = "block";
		} else {
			// Not logged in: hide elements safely
			if (userEmailEl) userEmailEl.textContent = "";
			if (status) status.textContent = "Not logged in";
			if (logoutBtn) logoutBtn.style.display = "none";
			if (signupBtn) signupBtn.style.display = "block";
			if (loginBtn) loginBtn.style.display = "block";
			if (getStartedBtn) getStartedBtn.style.display = "none";
			if (userEmailEl) userEmailEl.textContent = "";

			// Optional: redirect dashboard pages if not logged in
			if (window.location.pathname.includes("dashboard.html")) {
				window.location.href = "login.html";
			}
		}
	});
});
