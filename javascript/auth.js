import { auth, db } from "./firebase.js";
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	onAuthStateChanged,
	signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
	doc,
	setDoc,
	getDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

	// Helper to create user doc if missing
	async function ensureUserDoc(user) {
		const userRef = doc(db, "users", user.uid);
		const docSnap = await getDoc(userRef);
		if (!docSnap.exists()) {
			await setDoc(userRef, {
				email: user.email,
				createdAt: new Date(),
				categories: {},
			});
			console.log("Firestore user doc created for:", user.uid);
		}
	}

	// Sign Up
	if (signupBtn && emailInput && passwordInput && status) {
		signupBtn.addEventListener("click", async () => {
			try {
				const userCredential = await createUserWithEmailAndPassword(
					auth,
					emailInput.value,
					passwordInput.value
				);
				const user = userCredential.user;

				// Create Firestore doc for new user
				await ensureUserDoc(user);

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
				const userCredential = await signInWithEmailAndPassword(
					auth,
					emailInput.value,
					passwordInput.value
				);
				const user = userCredential.user;

				// Ensure Firestore doc exists
				await ensureUserDoc(user);

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
			window.location.href = "login.html";
		});
	}

	// Track auth state
	onAuthStateChanged(auth, async (user) => {
		if (user) {
			// Ensure Firestore doc exists for logged-in user
			await ensureUserDoc(user);

			if (userEmailEl) userEmailEl.textContent = `Logged in as: ${user.email}`;

			if (logoutBtn) logoutBtn.style.display = "block";
			if (signupBtn) signupBtn.style.display = "none";
			if (loginBtn) loginBtn.style.display = "none";
			if (getStartedBtn) getStartedBtn.style.display = "block";
		} else {
			if (userEmailEl) userEmailEl.textContent = "";
			if (status) status.textContent = "Not logged in";

			if (logoutBtn) logoutBtn.style.display = "none";
			if (signupBtn) signupBtn.style.display = "block";
			if (loginBtn) loginBtn.style.display = "block";
			if (getStartedBtn) getStartedBtn.style.display = "none";

			// Redirect if on dashboard
			if (window.location.pathname.includes("dashboard.html")) {
				window.location.href = "login.html";
			}
		}
	});
});
