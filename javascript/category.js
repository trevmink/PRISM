import { auth, db } from "./firebase.js";
import {
	doc,
	getDoc,
	updateDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let currentUser = null;
const unitTitle = document.getElementById("unit-title");
let selectedCategory = null;

// Load U.S. History lessons from JSON
async function loadUSHistoryLessons() {
	const response = await fetch("javascript/us_history.json");
	return await response.json();
	if (!response.ok) {
		throw new Error("Failed to load U.S. History lessons");
	}
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

	// loop through categories to find the selected one
	for (const categoryKey in userData.categories) {
		if (userData.categories[categoryKey].selected == true) {
			selectedCategory = categoryKey;
			break;
		}
	}
	console.log("Selected category:", selectedCategory);
	if (selectedCategory === "ush") {
		const unitId = Number(userData.categories.ush.currentUnit); //finds current unit so we can load the correct titles
		const lessons = await loadUSHistoryLessons();
		const unit = lessons.ush.units.find((u) => u.id === unitId); // gets the correct unit based on unitId (finding the current unit from user data)
		console.log(unit);
		if (!unit) {
			console.error("Unit not found for id:", unitId);
			return;
		}

		unitTitle.textContent = `U.S. History - ${unit.title}`; // sets the unit title based on selected unit
		createLessonButtons(unit);
	}
});

function createLessonButtons(unit) {
	// 1) Target the existing <ul class="lessons-list"> inside your container
	const lessonsContainer = document.getElementById("lessons-container");
	const lessonsList = lessonsContainer?.querySelector(".lessons-list");

	if (!lessonsList) {
		console.error(
			'Could not find ".lessons-list" inside #lessons-container. Check your HTML structure.'
		);
		return;
	}

	// 2) Clear any placeholder <li> items so you don't get duplicates
	lessonsList.innerHTML = "";

	// Helper to create a styled list item that matches your CSS
	function addLessonItem(label, description, href, lessonNumber) {
		const li = document.createElement("li");
		li.className = "lesson-item";

		const a = document.createElement("a");
		a.addEventListener("click", async (e) => {
			console.log(lessonNumber + " clicked");
			if (currentUser) {
				// update firebase with selected lesson
				await updateDoc(doc(db, "users", currentUser.uid), {
					[`categories.${selectedCategory}.currentLesson`]: lessonNumber,
				});
				console.log("Firestore updated with lesson:", lessonNumber);
				window.location.href = href;
			}
		});

		const titleDiv = document.createElement("div");
		titleDiv.textContent = label;

		const descDiv = document.createElement("div");
		descDiv.textContent = description;
		descDiv.className = "lesson-description";

		a.appendChild(titleDiv);
		a.appendChild(descDiv);
		li.appendChild(a);
		lessonsList.appendChild(li);
	}

	unit.lessons.forEach((lesson) => {
		addLessonItem(
			`Lesson ${lesson.id}: ${lesson.title}`,
			lesson.description,
			`lesson.html?unit=${unit.id}&lesson=${lesson.id}`,
			lesson.id
		);
	});

	// add extra items for weaknesses practice and final quiz
	addLessonItem(
		"Weak Skill Practice",
		"Practice weaknesses",
		"lesson.html?lesson=weaknesses",
		"weaknesses"
	);
	addLessonItem(
		"Final Quiz",
		"Take the final quiz",
		"lesson.html?lesson=final",
		"final"
	);
}
