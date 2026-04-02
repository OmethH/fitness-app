import {useState} from "react";
import { useNavigate } from "react-router-dom";
import {auth} from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

function Login(){
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try{
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            alert(`Logged in as ${user.email}`);
            navigate("/dashboard");
        } catch (error){
            console.error(error);
            alert(error.message);
        }
    };

    return (
        <div>
            <h1>Login</h1>
            <form onSubmit={handleLogin}>
                <label>
                    Email:
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
                </label>
                <br />
                <label>
                    Password:
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
                </label>
                <br />
                <button type="submit">Log In</button>
            </form>
        </div>
    );

}

export default Login;