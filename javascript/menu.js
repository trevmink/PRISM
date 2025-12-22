import { auth, db } from "./firebase.js";
import {
	doc,
	getDoc,
	updateDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let currentUser = null;

// Track auth state
onAuthStateChanged(auth, async (user) => {
	if (!user) {
		window.location.href = "login.html";
		return;
	}
	currentUser = user;
	loadUserCategories();
});

// Add category button click
function addCategory(button) {
	const container = button.closest(".category-container");
	const menu = container.querySelector(".menu");
	const card = container.querySelector(".category-card");

	button.style.display = "none";
	menu.style.display = "flex";
	card.style.display = "none"; // ensure card is hidden initially
}

// When a category is selected
async function checkSelection(select) {
	const container = select.closest(".category-container");
	const menu = container.querySelector(".menu");
	const card = container.querySelector(".category-card");
	const value = select.value;
	if (value === "none" || !currentUser) return;

	// Update Firestore
	await updateDoc(doc(db, "users", currentUser.uid), {
		[`categories.${value}`]: {
			selected: true,
			currentUnit: null,
			currentLesson: null,
			progress: 0,
			createdAt: new Date(),
		},
	});
	console.log("Firestore updated with category:", value);

	// Set dataset for reference
	container.dataset.category = value;

	// Update UI
	menu.style.display = "none";
	card.style.display = "block";
}

// Load previously selected categories
async function loadUserCategories() {
	const snap = await getDoc(doc(db, "users", currentUser.uid));
	if (!snap.exists()) return;

	const data = snap.data();
	if (!data.categories) return;

	const containers = document.querySelectorAll(".category-container");

	Object.keys(data.categories).forEach((category) => {
		// Find first empty container
		const container = Array.from(containers).find((c) => !c.dataset.category);

		if (!container) return; // no empty container left

		container.dataset.category = category;

		const menu = container.querySelector(".menu");
		const card = container.querySelector(".category-card");
		const btn = container.querySelector("button.add-category");

		if (menu) menu.style.display = "none";
		if (card) card.style.display = "block";
		if (btn) btn.style.display = "none";
	});
}

// Bind events after DOM loads
document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll(".add-category").forEach((btn) => {
		btn.addEventListener("click", () => addCategory(btn));
	});

	document.querySelectorAll(".category-select").forEach((select) => {
		select.addEventListener("change", () => checkSelection(select));
	});
});
