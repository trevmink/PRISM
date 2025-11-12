const US_HISTORY = [
	{
		question: "Who was the first President of the United States?",
		answers: [
			{
				text: "George Washington",
				isCorrect: true,
				reason: "CORRECT, He was the first president.",
			},
			{
				text: "Thomas Jefferson",
				isCorrect: false,
				reason: "WRONG, He was the third president.",
			},
			{
				text: "Abraham Lincoln",
				isCorrect: false,
				reason: "WRONG, He was the 16th president.",
			},
			{
				text: "John Adams",
				isCorrect: false,
				reason: "WRONG, He was the second president.",
			},
		],
	},
	{
		question: "What year did the United States declare independence?",
		answers: [
			{ text: "1776", isCorrect: true },
			{ text: "1781", isCorrect: false },
			{ text: "1787", isCorrect: false },
			{ text: "1791", isCorrect: false },
		],
	},
];

const lessonTitleElement = document.querySelector(".lesson-title");
const questionElement = document.getElementById("lesson-question");
const lessonButtonElement = document.getElementById("lesson-answers");
const navButtonElement = document.getElementById("nav-button");

let currentQuestionIndex = 0;
let score = 0;

// ADD PARAMETERS TO SELECT LESSON TOPIC/UNIT
function startLesson() {
	lessonTitleElement.textContent = "US History Lesson"; // REPLACE THIS LATER WITH A VAR SO IT CAN CHANGE BASED ON LESSON
	currentQuestionIndex = 0;
	score = 0;
	navButtonElement.textContent = "Next";
	navButtonElement.style.display = "none";

	showQuestion();
}

function showQuestion() {
	resetState();
	let currentQuestion = US_HISTORY[currentQuestionIndex];
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
	} else {
		selectedButton.classList.add("incorrect");
		selectedButton.nextSibling.textContent = selectedButton.dataset.reason; // Show reason for incorrect answer
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
	questionElement.textContent = `You scored ${score} out of ${US_HISTORY.length}!`;
	navButtonElement.textContent = "Restart Lesson";
	navButtonElement.style.display = "block";
}

function handleNextButton() {
	currentQuestionIndex++;
	if (currentQuestionIndex < US_HISTORY.length) {
		showQuestion();
	} else {
		showScore();
	}
}

navButtonElement.addEventListener("click", () => {
	if (currentQuestionIndex < US_HISTORY.length) {
		handleNextButton();
	} else {
		startLesson();
	}
});

startLesson();
