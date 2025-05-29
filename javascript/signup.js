// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

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
// const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

//Input
const signupBtn = document.getElementById("signup");

signupBtn.addEventListener("click", async function (event) {
	event.preventDefault();

	//Form Inputs (Stores form Inputs)
	const fullname = document.getElementById("fullname").value;
	const phone = document.getElementById("phone").value;
	const email = document.getElementById("email").value;
	const password = document.getElementById("password").value;
	const role = document.getElementById("role").value;

	try {
		const userCredential = await createUserWithEmailAndPassword(auth, email, password);
		const user = userCredential.user;

		await setDoc(doc(db, "user", user.uid), {
			userid: user.uid,
			fullname: fullname,
			phone: phone,
			email: email,
			role: role,
			password: password
		});

		alert("Sign Up Successful");
		window.location.href = "/BarDeli/html_pages/login.html";

	} catch (error) {
		console.error("Error during signup:", error);
		alert(error.message);
	}
});


