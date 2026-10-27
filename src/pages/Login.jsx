import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";
import { useAuth } from "../context/useAuth";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const message = location.state?.message;

    const { login } = useAuth();

    // Step 3 & 4: Send login credentials to backend, receive signed JWT, store in session
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:3000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setError(data.message || "Invalid email or password.");
                setLoading(false);
                return;
            }

            // Save signed JWT and user details in AuthContext & localStorage
            login(data.token, data.user);

            // Navigate to home page
            navigate("/");
        } catch (err) {
            console.error("Backend login request failed:", err);
            setError("Could not connect to the authentication server. Please ensure the backend is running on port 3000.");
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-In fallback
    const handleGoogleSignIn = async () => {
        setError("");
        setLoading(true);

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const userRef = doc(db, "users", user.uid);
            const userData = await getDoc(userRef);

            if (!userData.exists()) {
                await setDoc(userRef, {
                    name: user.displayName || "",
                    email: user.email,
                    photoURL: user.photoURL || "",
                    createdAt: new Date().toISOString()
                });
            }

            // Generate client session
            const userSession = {
                id: user.uid,
                name: user.displayName || user.email,
                email: user.email,
                photoURL: user.photoURL || ""
            };

            // Use Google token or mock JWT token
            const token = await user.getIdToken();
            login(token, userSession);

            navigate("/");
        } catch (err) {
            console.error("Google sign-in error:", err);
            if (err.code === "auth/popup-blocked") {
                setError("Popup was blocked by your browser. Please allow popups for this site and try again.");
            } else if (err.code === "auth/popup-closed-by-user") {
                setError("Sign-in popup was closed before completing.");
            } else {
                setError(err.message || "Google sign-in failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card login-card">
                <div className="auth-card-header">
                    <Link to="/signup" className="auth-switch-btn">
                        Sign up
                    </Link>
                </div>

                {/* Success message passed from previous navigation */}
                {message && (
                    <div className="auth-alert success-alert">
                        {message}
                    </div>
                )}

                {/* Error message alert displayed to user */}
                {error && (
                    <div className="auth-alert error-alert">
                        {error}
                    </div>
                )}

                {/* Email and password login form */}
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="login-email">Your email</label>
                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            placeholder="user@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="login-password">Your password</label>
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-btn"
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                <button
                    type="button"
                    className="google-btn"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                >
                    Continue with Google
                </button>
            </div>
        </div>
    );
}

export default Login;
