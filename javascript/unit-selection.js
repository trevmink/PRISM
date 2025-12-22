import { auth, db } from "./firebase.js";
import {
	doc,
	getDoc,
	updateDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let currentUser = null;
const selectionHeader = document.querySelector(".selection-header");
const unitsAmount = null;

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

	if (userData.categories?.ush) {
		selectionHeader.textContent = "U.S. History - Unit Selection";
		unitsAmount = 10;
	}
});
