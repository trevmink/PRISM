function addCategory(element, element2) {
	console.log("Add Category button clicked");
	element.style.display = "none";

	// Show the category dropdown menu
	element2.style.display = "flex";
}

function checkSelection(value, element2, card) {
	console.log("Selected category:", value);
	if (value !== "none") {
		// Do something with the selected category
		console.log("You selected the category: " + value);
		if (value == "ush") {
			console.log("U.S. History");
		}
		// Hide the dropdown menu after selection
		element2.style.display = "none";
		card.style.display = "block";
	}
}

function addCategory(button) {
	const container = button.closest(".category-container");
	const menu = container.querySelector(".menu");
	const card = container.querySelector(".category-card");

	button.style.display = "none";
	menu.style.display = "flex";
	card.style.display = "none"; // ensure card is hidden initially
}

function checkSelection(select) {
	const container = select.closest(".category-container");
	const menu = container.querySelector(".menu");
	const card = container.querySelector(".category-card");
	const value = select.value;

	if (value !== "none") {
		// Do something with the selected category
		console.log("You selected the category: " + value);
		if (value == "ush") {
			console.log("U.S. History");
			menu.style.display = "none";
			card.style.display = "block";
		}
	}
}
