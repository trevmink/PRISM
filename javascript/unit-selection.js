import { auth, db } from "./firebase.js";
import {
	doc,
	getDoc,
	updateDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let currentUser = null;
let completedUnits = null;
const selectionHeader = document.querySelector(".selection-header");
const selectionContent = document.querySelector(".selection-content");
let unitsAmount = null;
let category = null;

// Load U.S. History units from JSON
async function loadUSHistory() {
	const res = await fetch("javascript/us_history.json");
	const data = await res.json();
	return data.ush.units;
}

// Track auth state
onAuthStateChanged(auth, async (user) => {
	if (!user) {
		window.location.href = "login.html";
		return;
	}
	currentUser = user;

	const snap = await getDoc(doc(db, "users", currentUser.uid));
	const userData = snap.data();
	if (userData) {
		console.log("category", userData.categories);
	}

	completedUnits = userData?.categories?.ush?.completedUnits;
	console.log("completedUnits", completedUnits);

	if (userData.categories?.ush) {
		selectionHeader.textContent = "U.S. History - Unit Selection";
		unitsAmount = 9;
		const units = await loadUSHistory();
		createUnitButtons(units);
		// lock units based on progress
		lockUnitButtons();
		category = "ush";
	}
});

// When a unit is selected
async function checkSelection(select) {
	console.log("Selected unit button:", select);

	// update firebase with selected unit
	if (currentUser) {
		await updateDoc(doc(db, "users", currentUser.uid), {
			[`categories.${category}.currentUnit`]: select,
		});
		console.log("Firestore updated with unit:", select);
	}

	// redirect to lessons page
	window.location.href = "category.html";
}

// create unit selection buttons
function createUnitButtons(units) {
	selectionContent.innerHTML = "";
	units.forEach((unit, index) => {
		const card = document.createElement("div");
		card.className = "unit-card";

		card.innerHTML = `
            <h2>Unit ${index + 1}: ${unit.title}</h2>
            <p>${unit.description}</p>
           <button class="go-to-unit">Go to Unit</button>
        `;

		const button = card.querySelector(".go-to-unit");

		button.dataset.unit = index + 1;

		button.addEventListener("click", () => {
			checkSelection(index + 1);
		});

		selectionContent.appendChild(card);
	});
}

// lock unit buttons based on progress
function lockUnitButtons() {
	const buttons = selectionContent.querySelectorAll(".go-to-unit");

	// if no buttons found, exit early
	if (!buttons.length) {
		console.log("No unit buttons found to lock/unlock.");
		return;
	}

	// normalizes the firestore completedUnits data into a clean array of integers
	// converts strings to numbers, removes invalid entries, removes duplicates
	let completed = Array.isArray(completedUnits) ? completedUnits : [];

	completed = completed
		.map((x) => Number(x)) // convert to numbers
		.filter((x) => Number.isInteger(x)) // removes invalid values (words, decimals)
		.filter((x) => x > 0); // remove 0 or negative values

	// remove duplicates
	// future reference: ... separates each element of the array so Set can process them individually
	// set removes duplicates, then we spread them back into an array
	completed = [...new Set(completed)];

	// determines highest completed unit and thus which unit to unlock through
	const highestCompleted = completed.length ? Math.max(...completed) : 0;
	// unlockThrough is the highest completed unit + 1 (next unit to do), making the available range 1 to unlockThrough + 1 (so the next is unlocked)
	let unlockThrough = Math.max(1, highestCompleted + 1);

	// makes it so the unlocked units cannot exceed total units available
	const totalUnits = buttons.length;
	if (unlockThrough > totalUnits) unlockThrough = totalUnits;

	// iterate through each button and lock/unlock based on progress (styling)
	buttons.forEach((button) => {
		// finds which unit this button represents
		const unitNumber = Number(button.dataset.unit);

		// locks unit if unitNumber is invalid
		if (!Number.isInteger(unitNumber) || unitNumber <= 0) {
			button.disabled = true;
			button.textContent = "Locked";
			button.closest(".unit-card")?.classList.add("locked");
			return;
		}

		// unlocks unit if it is in the range of unlocked units (1 to unlockThrough + 1)
		const isUnlocked = unitNumber <= unlockThrough;

		// if isUnlocked is true (unit number is in the range), unlock it; otherwise, lock it
		if (isUnlocked) {
			button.disabled = false;
			button.textContent = "Go to Unit";
			button.closest(".unit-card")?.classList.remove("locked");
		} else {
			button.disabled = true;
			button.textContent = "Locked";
			button.closest(".unit-card")?.classList.add("locked");
		}
	});
}
