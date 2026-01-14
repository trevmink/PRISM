import { auth, db } from "./firebase.js";
import {
	doc,
	getDoc,
	updateDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let currentUser = null;
let category = null;
let currentLesson = null;
let currentUnit = null;

// Track auth state
onAuthStateChanged(auth, async (user) => {
	if (!user) {
		window.location.href = "login.html";
		return;
	}
	currentUser = user;

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

	const lessonData = await loadUSH(currentUnit, currentLesson);
	console.log("LESSON DATA", lessonData);

	lessonTitle =
		lessonData.title ?? `Unit ${currentUnit} • Lesson ${currentLesson}`;
	lessonContent = lessonData.questions ?? lessonData; // depends on your JSON shape
	startLesson();
});

// load ush json lesson content
async function loadUSH(unit, lesson) {
	const res = await fetch("javascript/us_history_questions.json");
	const data = await res.json();
	return data.ush.units[unit - 1].lessons[lesson - 1];
}

const PARAMETERS = new URLSearchParams(window.location.search);
let lessonTitle = "placeholder";
let lessonContent = "placeholder";

// SET LESSON TITLE AND CONTENT BASED ON TOPIC PARAMETER
const lessonTitleElement = document.querySelector(".lesson-title");
const questionElement = document.getElementById("lesson-question");
const lessonButtonElement = document.getElementById("lesson-answers");
const navButtonElement = document.getElementById("nav-button");
const exitButtonElement = document.getElementById("exit-button");

let currentQuestionIndex = 0;
let score = 0;

// ADD PARAMETERS TO SELECT LESSON TOPIC/UNIT
function startLesson() {
	lessonTitleElement.textContent = lessonTitle; // REPLACE THIS LATER WITH A VAR SO IT CAN CHANGE BASED ON LESSON
	currentQuestionIndex = 0;
	score = 0;
	navButtonElement.textContent = "Next";
	navButtonElement.style.display = "none";

	showQuestion();
}

function showQuestion() {
	resetState();
	let currentQuestion = lessonContent[currentQuestionIndex];
	let questionNo = currentQuestionIndex + 1;
	questionElement.textContent = questionNo + ". " + currentQuestion.question;
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

	// Checks if the selected button is the correct answer
	const isCorrect = selectedButton.dataset.correct === "true";
	if (isCorrect) {
		// Adds the "correct" styling class to the selected button
		selectedButton.classList.add("correct");
		score++;
		console.log("Score:", score);
	} else {
		selectedButton.classList.add("incorrect");
		selectedButton.nextSibling.textContent = selectedButton.dataset.reason; // Show reason for incorrect answer
		console.log("Score:", score);
	}

	// Loops through all answer buttons to show correct answers and disable them
	Array.from(lessonButtonElement.children).forEach((button) => {
		if (button.dataset.correct === "true") {
			button.classList.add("correct");
			button.nextSibling.textContent = button.dataset.reason; // Show reason for correct answer
		}
		button.disabled = true;
	});
	navButtonElement.style.display = "block";
}

function resetState() {
	while (lessonButtonElement.firstChild) {
		lessonButtonElement.removeChild(lessonButtonElement.firstChild);
	}
}

function showScore() {
	resetState();
	questionElement.textContent = `You scored ${score} out of ${lessonContent.length}!`;
	navButtonElement.textContent = "Restart Lesson";
	navButtonElement.style.display = "block";
	exitButtonElement.style.display = "block";
}

function handleNextButton() {
	currentQuestionIndex++;
	if (currentQuestionIndex < lessonContent.length) {
		showQuestion();
	} else {
		showScore();
	}
}

navButtonElement.addEventListener("click", () => {
	if (currentQuestionIndex < lessonContent.length) {
		handleNextButton();
	} else {
		startLesson();
	}
});
