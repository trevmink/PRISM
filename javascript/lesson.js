import { auth, db } from "./firebase.js";
import {
	doc,
	getDoc,
	updateDoc,
	serverTimestamp,
	arrayUnion,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let currentUser = null;
let category = null;
let currentLesson = null;
let currentUnit = null;
let isPracticeMode = false;
let mode = null;

const resultMessageEl = document.getElementById("result-message");

const PARAMETERS = new URLSearchParams(window.location.search);

// Track auth state
onAuthStateChanged(auth, async (user) => {
	if (!user) {
		window.location.href = "login.html";
		return;
	}
	currentUser = user;

	mode = PARAMETERS.get("lesson"); // could be "weaknesses" or "final" or a number

	const snap = await getDoc(doc(db, "users", currentUser.uid));
	const userData = snap.data();

	const categories = userData?.categories || {};

	// find selected category
	for (const c in categories) {
		if (categories[c]?.selected === true) {
			category = c;
			console.log("CATEGORY", category);

			currentUnit = categories[c]?.currentUnit;
			console.log("CURRENT UNIT", currentUnit);

			currentLesson = categories[c]?.currentLesson;
			console.log("CURRENT LESSON", currentLesson);
			break;
		}
	}
	console.log("READ KEY:", lessonIdentifier(currentUnit, currentLesson));
	console.log("PERF MAP:", userData?.categories?.[category]?.lessonPerformance);
	if (mode === "final") {
		console.log("Loading final quiz for unit", currentUnit);

		const lessonData = await loadUSHFinal(currentUnit);

		lessonTitle = lessonData.lessonTitle;
		lessonContent = lessonData.questions;

		// finals should not save lesson performance
		isPracticeMode = false;

		startLesson();
		return;
	} else if (mode === "weaknesses") {
		isPracticeMode = true;

		lessonTitle = "Weak Skills Practice";

		const pack = await loadWeakPracticeQuestions(userData);
		lessonContent = pack.questions;

		// Update the "best-score" area to show what this practice includes (optional)
		const bestScoreEl = document.getElementById("best-score");
		if (bestScoreEl) {
			bestScoreEl.textContent = `Weak lessons included: ${pack.weakKeys.length}`;
		}

		// If no weak lessons, show message and stop
		if (lessonContent.length === 0) {
			lessonTitleElement.textContent = "Weak Skills Practice";
			questionElement.textContent =
				"No weak lessons right now (65%+ on all completed lessons).";
			navButtonElement.style.display = "none";
			exitButtonElement.style.display = "block";
			return;
		}

		startLesson();
		return;
	}

	const lessonData = await loadUSH(currentUnit, currentLesson);
	console.log("LESSON DATA", lessonData);

	lessonTitle =
		lessonData.lessonTitle ?? `Unit ${currentUnit} - Lesson ${currentLesson}`;
	lessonContent = lessonData.questions;

	const bestScoreEl = document.getElementById("best-score");
	const key = lessonIdentifier(currentUnit, currentLesson); // use your current function (no args)
	const perf = userData?.categories?.[category]?.lessonPerformance?.[key];

	if (bestScoreEl) {
		bestScoreEl.textContent = perf
			? `Best: ${perf.bestPercent}% (Last: ${perf.lastPercent}%)`
			: "Best: — N/A";
	}

	startLesson();
});

// unit and lesson identifier
function lessonIdentifier(unit, lesson) {
	return `unit${unit}_lesson${lesson}`;
}

function parseLessonKey(key) {
	// key like "u2_l3"
	const match = key.match(/^u(\d+)_l(\d+)$/);
	if (!match) return null;
	return { unit: Number(match[1]), lesson: Number(match[2]) };
}

function parseUnitLessonKey(key) {
	const m = key.match(/^unit(\d+)_lesson(\d+)$/);
	if (!m) return null;
	return { unit: Number(m[1]), lesson: Number(m[2]) };
}

async function loadWeakPracticeQuestions(userData) {
	const perfMap = userData?.categories?.[category]?.lessonPerformance || {};

	// gather weak lessons (bestPercent < 65)
	const weakKeys = [];
	for (const [key, perf] of Object.entries(perfMap)) {
		if (!perf?.completed) continue;
		const p = perf.bestPercent ?? perf.lastPercent ?? 0;
		if (p < 65) weakKeys.push(key);
	}

	// load JSON once
	const res = await fetch("javascript/us_history_questions.json");
	const data = await res.json();

	// combine questions
	const combined = [];
	for (const key of weakKeys) {
		const parsed = parseUnitLessonKey(key);
		if (!parsed) continue;

		const unitObj = data.ush.units.find((u) => u.unitId === parsed.unit);
		if (!unitObj) continue;

		const lessonObj = unitObj.lessons.find((l) => l.lessonId === parsed.lesson);
		if (!lessonObj) continue;

		lessonObj.questions.forEach((q) => combined.push({ ...q, _source: key }));
	}

	// optional shuffle
	combined.sort(() => Math.random() - 0.5);

	return { weakKeys, questions: combined };
}

// saves lesson performance
async function saveLessonPerformance(score, total) {
	if (!currentUser || !category || !currentUnit || !currentLesson) return;

	const userRef = doc(db, "users", currentUser.uid);
	const snap = await getDoc(userRef);
	const userData = snap.data() || {};

	const key = lessonIdentifier(currentUnit, currentLesson);

	const perf = userData.categories?.[category]?.lessonPerformance?.[key] || {};

	const lastPercent = Math.round((score / total) * 100);
	const bestPercent = Math.max(perf.bestPercent ?? 0, lastPercent);
	const attempts = (perf.attempts ?? 0) + 1;

	await updateDoc(userRef, {
		[`categories.${category}.lessonPerformance.${key}`]: {
			completed: true,
			lastScore: score,
			lastOutOf: total,
			lastPercent,
			bestPercent,
			attempts,
			updatedAt: serverTimestamp(),
		},
		[`categories.${category}.completedLessons`]: arrayUnion(key),
	});

	const bestScoreEl = document.getElementById("best-score");
	if (bestScoreEl) {
		bestScoreEl.textContent = `Best: ${bestPercent}% (Last: ${lastPercent}%)`;
	}
}

// load ush json lesson content
async function loadUSH(unit, lesson) {
	const res = await fetch("javascript/us_history_questions.json");
	const data = await res.json();

	const unitObj = data.ush.units.find((u) => u.unitId === Number(unit));
	if (!unitObj) throw new Error(`Unit not found: ${unit}`);

	const lessonObj = unitObj.lessons.find((l) => l.lessonId === Number(lesson));
	if (!lessonObj)
		throw new Error(`Lesson not found: ${lesson} in unit ${unit}`);

	return lessonObj;
}

async function loadUSHFinal(unit) {
	const res = await fetch("javascript/us_history_eou.json");
	const data = await res.json();

	const unitKey = String(unit);
	const unitObj = data?.ush?.units?.[unitKey];

	if (!unitObj) {
		throw new Error(`Final quiz not found for unit: ${unit}`);
	}

	// Normalize to match lesson engine expectations
	return {
		lessonTitle: unitObj.title,
		questions: unitObj.questions,
	};
}

let lessonTitle = "placeholder";
let lessonContent = "placeholder";

// SET LESSON TITLE AND CONTENT BASED ON TOPIC PARAMETER
const lessonTitleElement = document.querySelector(".lesson-title");
const questionElement = document.getElementById("lesson-question");
const lessonButtonElement = document.getElementById("lesson-answers");
const navButtonElement = document.getElementById("nav-button");
const exitButtonElement = document.getElementById("exit-button");
const currentScoreElement = document.getElementById("current-score");

let currentQuestionIndex = 0;
let score = 0;

// ADD PARAMETERS TO SELECT LESSON TOPIC/UNIT
function startLesson() {
	lessonTitleElement.textContent = lessonTitle; // REPLACE THIS LATER WITH A VAR SO IT CAN CHANGE BASED ON LESSON
	currentQuestionIndex = 0;
	score = 0;
	navButtonElement.textContent = "Next";
	navButtonElement.style.display = "none";

	currentScoreElement.textContent =
		`Current Score: 0 / ${lessonContent.length}` + " (0%)";

	showQuestion();
}

function showQuestion() {
	resetState();
	let currentQuestion = lessonContent[currentQuestionIndex];
	let questionNo = currentQuestionIndex + 1;
	questionElement.textContent = questionNo + ". " + currentQuestion.question;

	const sourceEl = document.getElementById("question-source");

	// Only show source during Weak Practice
	if (isPracticeMode && currentQuestion._source && sourceEl) {
		const parsed = parseUnitLessonKey(currentQuestion._source);

		if (parsed) {
			sourceEl.textContent = `From Unit ${parsed.unit}, Lesson ${parsed.lesson}`;
			sourceEl.style.display = "block";
		} else {
			sourceEl.style.display = "none";
		}
	} else if (sourceEl) {
		sourceEl.style.display = "none";
	}
	navButtonElement.style.display = "none";

	// For each answer, create a button
	currentQuestion.answers.forEach((answer) => {
		const button = document.createElement("button");
		const reason = document.createElement("p");
		button.textContent = answer.text;
		button.dataset.reason = answer.reason;
		// Adds styling class to the each answer button
		button.classList.add("answer-button");
		reason.classList.add("reason");
		lessonButtonElement.appendChild(button);
		lessonButtonElement.appendChild(reason);

		if (answer.isCorrect) {
			// Adds the "correct" data attribute to the button
			button.dataset.correct = answer.isCorrect;
		}

		// Listens for click on each answer button > calls selectAnswer function
		button.addEventListener("click", selectAnswer);
	});
}

function selectAnswer(event) {
	// Determines which button was clicked
	const selectedButton = event.target;
	resetScroll();
	// Checks if the selected button is the correct answer
	const isCorrect = selectedButton.dataset.correct === "true";
	if (isCorrect) {
		// Adds the "correct" styling class to the selected button
		selectedButton.classList.add("correct");
		score++;
		console.log("Score:", score);
		currentScoreElement.textContent =
			`Current Score: ${score}` +
			" / " +
			lessonContent.length +
			" (" +
			Math.round((score / lessonContent.length) * 100) +
			"%)";
		resultMessageEl.textContent = "CORRECT!";
		resultMessageEl.style.color = "#4caf50";
	} else {
		selectedButton.classList.add("incorrect");
		selectedButton.nextSibling.textContent = selectedButton.dataset.reason; // Show reason for incorrect answer
		console.log("Score:", score);
		currentScoreElement.textContent =
			`Current Score: ${score}` +
			" / " +
			lessonContent.length +
			" (" +
			Math.round((score / lessonContent.length) * 100) +
			"%)";
		resultMessageEl.textContent = "INCORRECT.";
		resultMessageEl.style.color = "#f44336";
	}

	// Loops through all answer buttons to show correct answers and disable them
	const answerButtons = lessonButtonElement.querySelectorAll(
		"button.answer-button",
	);
	answerButtons.forEach((btn) => {
		if (btn.dataset.correct === "true") {
			btn.classList.add("correct");
			btn.nextSibling.textContent = btn.dataset.reason;
		}
		btn.disabled = true;
	});
	// Show the navigation button to proceed
	navButtonElement.style.display = "block";
}

function resetState() {
	while (lessonButtonElement.firstChild) {
		lessonButtonElement.removeChild(lessonButtonElement.firstChild);
	}

	const sourceEl = document.getElementById("question-source");
	if (sourceEl) sourceEl.style.display = "none";

	exitButtonElement.style.display = "none";
	resultMessageEl.textContent = "";
}

function showScore() {
	resetState();

	navButtonElement.textContent = "Restart Lesson";
	navButtonElement.style.display = "block";
	exitButtonElement.style.display = "block";

	if (isPracticeMode) {
		questionElement.textContent = `Practice complete: ${score} / ${lessonContent.length}`;
		return; // do NOT save during practice
	}

	// Normal lesson: show score AND save performance
	questionElement.textContent = `You scored ${score} out of ${lessonContent.length}!`;
	saveLessonPerformance(score, lessonContent.length);
}

async function handleNextButton() {
	resetScroll();

	currentQuestionIndex++;
	if (currentQuestionIndex < lessonContent.length) {
		showQuestion();
	} else {
		if (mode == "final") {
			console.log("Final quiz completed for unit " + currentUnit);

			// Additional logic for final quiz completion can be added here
		}
		try {
			await markUSHUnitCompleted(Number(currentUnit));
		} catch (error) {
			console.error("Error marking unit completed:", error);
		}
		showScore();
	}
}

async function markUSHUnitCompleted(unitNumber) {
	if (!currentUser) return;

	const userId = currentUser.uid;
	const userRef = doc(db, "users", userId);

	await updateDoc(userRef, {
		"categories.ush.completedUnits": arrayUnion(unitNumber),
	});
}

navButtonElement.addEventListener("click", () => {
	if (currentQuestionIndex < lessonContent.length) {
		handleNextButton();
	} else {
		startLesson();
	}
});

function resetScroll() {
	const answersEl = document.getElementById("lesson-answers");
	if (!answersEl) return;

	answersEl.scrollTo({
		top: 0,
		behavior: "auto", // use "smooth" if you prefer
	});
}
