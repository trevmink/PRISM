import { auth, db } from "./firebase.js";
import {
	doc,
	getDoc,
	updateDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let currentUser = null;
const unitTitle = document.getElementById("unit-title");
const strengthsDescEl = document.querySelector(".strengths-description");
const weaknessesDescEl = document.querySelector(".weaknesses-description");

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
	const perfMap =
		userData?.categories?.[selectedCategory]?.lessonPerformance || {};
	// Load title map so strengths/weaknesses can use real lesson titles
	const lessonsJson = await loadUSHistoryLessons();
	const titleMap = buildLessonTitleMap(lessonsJson);
	updateStrengthWeaknessDescriptions(perfMap, titleMap);

	console.log("Selected category:", selectedCategory);

	if (selectedCategory === "ush") {
		const unitId = Number(userData.categories.ush.currentUnit); //finds current unit so we can load the correct titles
		const lessons = lessonsJson;
		const unit = lessons.ush.units.find((u) => u.id === unitId); // gets the correct unit based on unitId (finding the current unit from user data)
		console.log(unit);
		if (!unit) {
			console.error("Unit not found for id:", unitId);
			return;
		}

		unitTitle.textContent = `U.S. History - ${unit.title}`; // sets the unit title based on selected unit
		createLessonButtons(unit, perfMap);
	}
});

function createLessonButtons(unit, perfMap) {
	function getStatus(perf) {
		if (!perf?.completed) return null;

		const p = perf.bestPercent ?? perf.lastPercent ?? 0;
		if (p < 65) return { text: `Weak (${p}%)`, type: "weak" };
		if (p >= 85) return { text: `Strong (${p}%)`, type: "strong" };
		return { text: `Ok (${p}%)`, type: "ok" };
	}

	// 1) Target the existing <ul class="lessons-list"> inside your container
	const lessonsContainer = document.getElementById("lessons-container");
	const lessonsList = lessonsContainer?.querySelector(".lessons-list");

	if (!lessonsList) {
		console.error(
			'Could not find ".lessons-list" inside #lessons-container. Check your HTML structure.',
		);
		return;
	}

	// 2) Clear any placeholder <li> items so you don't get duplicates
	lessonsList.innerHTML = "";

	// Helper to create a styled list item that matches your CSS
	function addLessonItem(
		label,
		description,
		href,
		lessonNumber,
		disabled = false,
	) {
		const li = document.createElement("li");
		li.className = "lesson-item";

		const a = document.createElement("a");

		if (disabled) {
			a.classList.add("disabled-link");
			a.addEventListener("click", (e) => e.preventDefault());
		} else {
			a.addEventListener("click", async () => {
				if (!currentUser) return;

				if (Number.isInteger(lessonNumber)) {
					await updateDoc(doc(db, "users", currentUser.uid), {
						[`categories.${selectedCategory}.currentLesson`]: lessonNumber,
					});
				}
				// location change
				window.location.href = href;
			});
		}

		const titleDiv = document.createElement("div");
		titleDiv.textContent = label;

		const descDiv = document.createElement("div");
		descDiv.textContent = description;
		descDiv.className = "lesson-description";

		a.appendChild(titleDiv);
		a.appendChild(descDiv);
		// Add performance status after title/desc
		if (Number.isInteger(lessonNumber)) {
			const key = `unit${unit.id}_lesson${lessonNumber}`;
			const perf = perfMap?.[key];
			const status = getStatus(perf);

			if (status) {
				const statusDiv = document.createElement("div");
				statusDiv.textContent = status.text;
				statusDiv.className = `lesson-performance ${status.type}`;
				a.appendChild(statusDiv);
			}
		}
		li.appendChild(a);
		lessonsList.appendChild(li);
	}

	unit.lessons.forEach((lesson) => {
		addLessonItem(
			`Lesson ${lesson.id}: ${lesson.title}`,
			lesson.description,
			`lesson.html?unit=${unit.id}&lesson=${lesson.id}`,
			lesson.id,
		);
	});

	// add extra items for weaknesses practice and final quiz
	const weakCount = Object.values(perfMap || {}).filter((p) => {
		const percent = p?.bestPercent ?? p?.lastPercent ?? 0;
		return p?.completed && percent < 65;
	}).length;
	addLessonItem(
		"Weak Skill Practice",
		weakCount > 0
			? `Practice weaknesses (${weakCount} weak lesson${
					weakCount === 1 ? "" : "s"
				})`
			: "No weaknesses right now",
		"lesson.html?lesson=weaknesses",
		"weaknesses",
		weakCount === 0,
	);

	addLessonItem(
		"Final Quiz",
		"Take the final quiz",
		"lesson.html?lesson=final",
		"final",
	);
}

function parseUnitLessonKey(key) {
	const m = key.match(/^unit(\d+)_lesson(\d+)$/);
	if (!m) return null;
	return { unitId: Number(m[1]), lessonId: Number(m[2]) };
}

function buildLessonTitleMap(lessonsJson) {
	const map = {}; // key -> "Unit Title — Lesson Title"

	for (const unit of lessonsJson.ush.units) {
		for (const lesson of unit.lessons) {
			const key = `unit${unit.id}_lesson${lesson.id}`;
			map[key] = `${unit.title} — ${lesson.title}`;
		}
	}
	return map;
}

function updateStrengthWeaknessDescriptions(perfMap, titleMap) {
	const entries = Object.entries(perfMap || {}).filter(
		([, perf]) => perf?.completed,
	);

	if (entries.length === 0) {
		if (strengthsDescEl)
			strengthsDescEl.textContent = "Complete a lesson to see your strengths.";
		if (weaknessesDescEl)
			weaknessesDescEl.textContent =
				"Complete a lesson to see your weaknesses.";
		return;
	}

	const strengths = [];
	const weaknesses = [];

	for (const [key, perf] of entries) {
		const percent = perf.bestPercent ?? perf.lastPercent ?? 0;
		const label = titleMap[key] ?? key;

		if (percent >= 85) strengths.push({ key, label, percent });
		else if (percent < 65) weaknesses.push({ key, label, percent });
	}

	strengths.sort((a, b) => b.percent - a.percent);
	weaknesses.sort((a, b) => a.percent - b.percent);

	if (strengthsDescEl) {
		strengthsDescEl.innerHTML = "";
		if (strengths.length === 0) {
			strengthsDescEl.textContent =
				"No strong lessons yet (85%+). Keep practicing to build strengths.";
		} else {
			const label = document.createElement("div");
			label.className = "perf-section-label";
			label.textContent = "(Top 3)";

			const wrap = document.createElement("div");
			wrap.className = "perf-pill-wrap";

			strengths.slice(0, 3).forEach((s) => {
				const pill = makePerfPill({ ...s, type: "strong" });
				if (pill) wrap.appendChild(pill);
			});

			strengthsDescEl.appendChild(label);

			strengthsDescEl.appendChild(wrap);
		}

		if (weaknessesDescEl) {
			weaknessesDescEl.innerHTML = ""; // clear
			if (weaknesses.length === 0) {
				weaknessesDescEl.textContent =
					"No weak lessons right now (below 65%). Great work.";
			} else {
				const label = document.createElement("div");
				label.className = "perf-section-label";
				label.textContent = "(Top 3)";

				const wrap = document.createElement("div");
				wrap.className = "perf-pill-wrap";

				weaknesses.slice(0, 3).forEach((w) => {
					const pill = makePerfPill({ ...w, type: "weak" });
					if (pill) wrap.appendChild(pill);
				});

				weaknessesDescEl.appendChild(label);
				weaknessesDescEl.appendChild(wrap);
			}
		}
	}
}

function navigateToLesson(unitId, lessonId) {
	if (!currentUser || !selectedCategory) return;

	updateDoc(doc(db, "users", currentUser.uid), {
		[`categories.${selectedCategory}.currentUnit`]: unitId,
		[`categories.${selectedCategory}.currentLesson`]: lessonId,
	}).then(() => {
		window.location.href = `lesson.html?unit=${unitId}&lesson=${lessonId}`;
	});
}

function makePerfPill({ key, label, percent, type }) {
	const parsed = parseUnitLessonKey(key);
	if (!parsed) return null;

	// Only show the lesson title (drop the unit title for clarity)
	const lessonTitle = label.split(" — ").pop();

	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = `perf-pill ${type}`;
	btn.textContent = `${lessonTitle} (${percent}%)`;
	btn.addEventListener("click", () =>
		navigateToLesson(parsed.unitId, parsed.lessonId),
	);

	return btn;
}
