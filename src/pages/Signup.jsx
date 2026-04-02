import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { 
  doc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";

function Signup() {
  const [role, setRole] = useState("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // 1️⃣ Prevent duplicate accounts for the same role
      const q = query(
        collection(db, "users"),
        where("email", "==", email),
        where("role", "==", role)
      );

      const existing = await getDocs(q);

      if (!existing.empty) {
        alert(`This email already has a ${role} account.`);
        return;
      }

      // 2️⃣ Create Firebase Authentication user 
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // 3️⃣ Store user role in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email,
        role,
        createdAt: new Date(),
      });

      alert(`Signed up as ${role}: ${email}`);
      navigate("/login");

    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  return (
    <div>
      <h1>Signup</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Role:
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="client">Client</option>
            <option value="trainer">Trainer</option>
          </select>
        </label>

        <br />

        <label>
          Email:
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </label>

        <br />

        <label>
          Password:
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </label>

        <br />

        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}

export default Signup;