import { auth, db } from "./firebase.js";
import {
	doc,
	getDoc,
	updateDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let currentUser = null;

// helper: clear all selected flags on dashboard load
async function clearAllSelectedFlags() {
	if (!currentUser) return;

	const userRef = doc(db, "users", currentUser.uid);
	const snap = await getDoc(userRef);
	if (!snap.exists()) {
		console.error("User doc does not exist:", currentUser.uid);
		return;
	}

	const data = snap.data();
	const categories = data?.categories || {};

	const updates = {};
	for (const key of Object.keys(categories)) {
		updates[`categories.${key}.selected`] = false;
	}

	// nothing to clear
	if (!Object.keys(updates).length) return;

	try {
		await updateDoc(userRef, updates);
		console.log("Dashboard load: all selected flags set to false");
	} catch (err) {
		console.error("Failed to clear selected flags:", err);
	}
}

// Track auth state
onAuthStateChanged(auth, async (user) => {
	if (!user) {
		window.location.href = "login.html";
		return;
	}
	currentUser = user;

	// 1) reset selected for every category on load (your requirement)
	await clearAllSelectedFlags();

	// 2) show the user's category cards and wire Continue buttons
	await loadUserCategories();
});

// When user presses Continue on a shown card, update Firestore selection
async function continueCategory(categoryKey) {
	if (!currentUser) return;

	console.log("Continue button clicked for:", categoryKey);

	const userRef = doc(db, "users", currentUser.uid);

	// read latest categories so we can set all selected = false
	const snap = await getDoc(userRef);
	if (!snap.exists()) {
		console.error("User doc does not exist:", currentUser.uid);
		return;
	}

	const data = snap.data();
	const categories = data?.categories || {};

	// build one update: all false, one true
	const updates = {};
	for (const key of Object.keys(categories)) {
		updates[`categories.${key}.selected`] = false;
	}
	updates[`categories.${categoryKey}.selected`] = true;

	try {
		await updateDoc(userRef, updates);
		console.log("Selected set to true for:", categoryKey);
	} catch (err) {
		console.error("Failed to set selected category:", err);
		return;
	}

	// go to next page (this was commented out before)
	window.location.href = "unit-selection.html";
}

// Load previously selected categories (shows the user's cards + wires Continue button)
async function loadUserCategories() {
	const snap = await getDoc(doc(db, "users", currentUser.uid));
	if (!snap.exists()) return;

	const data = snap.data();
	if (!data.categories) return;

	const containers = document.querySelectorAll(".category-container");
	if (!containers.length) {
		console.warn("No .category-container elements found in DOM.");
		return;
	}

	Object.keys(data.categories).forEach((category) => {
		// Find first empty container
		const container = Array.from(containers).find((c) => !c.dataset.category);
		if (!container) return; // no empty container left

		// Attach the category key to the container so the card "knows" what it represents
		container.dataset.category = category;

		const menu = container.querySelector(".menu");
		const card = container.querySelector(".category-card");
		const btn = container.querySelector("button.add-category");

		// show the card for this saved category
		if (menu) menu.style.display = "none";
		if (card) card.style.display = "block";
		if (btn) btn.style.display = "none";

		// IMPORTANT: wire the Continue button NOW (after the card is revealed)
		const continueBtn = container.querySelector(".continue-button");
		if (continueBtn) {
			// store category on the button too (optional but useful)
			continueBtn.dataset.category = category;

			// overwrite any previous handler so we don't double-bind if loadUserCategories runs again
			continueBtn.onclick = () => continueCategory(category);
		} else {
			console.warn(
				`No .continue-button found inside card for category: ${category}`
			);
		}
	});
}
