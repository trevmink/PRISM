import { auth, db } from "./firebase.js";
import {
	doc,
	getDoc,
	updateDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let currentUser = null;
let lessonNumber = null;
const unitTitle = document.getElementById("unit-title");

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
		if (userData.categories.ush.currentUnit == "1") {
			unitTitle.textContent = "U.S. History - Colonization & Early America";
			lessonNumber = 8;
			console.log("lessonNumber", lessonNumber);
		} else if (userData.categories.ush.currentUnit == "2") {
			unitTitle.textContent = "U.S. History - Revolution & Independence";
		} else if (userData.categories.ush.currentUnit == "3") {
			unitTitle.textContent = "U.S. History - Constitution & Federalism";
		} else if (userData.categories.ush.currentUnit == "4") {
			unitTitle.textContent = "U.S. History - Westward Expansion";
		} else if (userData.categories.ush.currentUnit == "5") {
			unitTitle.textContent = "U.S. History - Civil War & Reconstruction";
		} else if (userData.categories.ush.currentUnit == "6") {
			unitTitle.textContent = "U.S. History - Industrialization";
		} else if (userData.categories.ush.currentUnit == "7") {
			unitTitle.textContent = "U.S. History - Progressive Era";
		} else if (userData.categories.ush.currentUnit == "8") {
			unitTitle.textContent = "U.S. History - World Wars";
		} else if (userData.categories.ush.currentUnit == "9") {
			unitTitle.textContent = "U.S. History - Cold War & Modern America";
		}
	}
});
