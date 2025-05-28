// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyDcG-6PVuSQjhBVNX2V-8iDBoyVzf_2Tik",
	authDomain: "bardeli2.firebaseapp.com",
	projectId: "bardeli2",
	storageBucket: "bardeli2.firebasestorage.app",
	messagingSenderId: "697059919180",
	appId: "1:697059919180:web:f94b7cd578356bd1653be9",
	measurementId: "G-73MPNVZXSD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Login button
const login = document.getElementById("login");

login.addEventListener("click", async function (event) {
	event.preventDefault();

	const email = document.getElementById("email").value;
	const password = document.getElementById("password").value;

	try {
		const userCredential = await signInWithEmailAndPassword(auth, email, password);
		const user = userCredential.user;

		// Get user's role from Firestore
		const userDocRef = doc(db, "user", user.uid);
		const userDocSnap = await getDoc(userDocRef);

		if (userDocSnap.exists()) {
			const userData = userDocSnap.data();
			const role = userData.role;

			alert(`Logged in as ${role}`);

			if (role === "Admin") {
				window.location.href = "/html_pages/Admin/adminpage.html";
			} else if (role === "Customer") {
				window.location.href = "/html_pages/Customer/customerpage.html";
			} else {
				alert("Unknown role! Cannot redirect.");
			}
		} else {
			alert("User data not found in Firestore!");
		}
	} catch (error) {
		alert(error.message);
		console.error("Login error:", error);
	}
});


