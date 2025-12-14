// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyD2C_qDraVfFeigcgWwoGx_u7342v4NPpU",
	authDomain: "prism-36a6b.firebaseapp.com",
	projectId: "prism-36a6b",
	storageBucket: "prism-36a6b.appspot.com",
	messagingSenderId: "532476977580",
	appId: "1:532476977580:web:32727f8a263c0717655a09",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Export Auth and Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);
