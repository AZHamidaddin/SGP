import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "./UserContext";

export default function Signup() {
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const validatePassword = (password) => {
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    validatePassword(newPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validate all fields
    if (!name || !email || !password) {
      setErrors({ general: "Please fill in all fields." });
      return;
    }

    // Frontend password validation
    const passwordValidation = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    // Check if all password requirements are met
    if (!Object.values(passwordValidation).every(Boolean)) {
      const passwordErrors = [];
      if (!passwordValidation.length) passwordErrors.push("Password must be at least 8 characters long");
      if (!passwordValidation.uppercase) passwordErrors.push("Password must contain at least one uppercase letter");
      if (!passwordValidation.lowercase) passwordErrors.push("Password must contain at least one lowercase letter");
      if (!passwordValidation.number) passwordErrors.push("Password must contain at least one number");
      if (!passwordValidation.special) passwordErrors.push("Password must contain at least one special character");
      
      setErrors({ password: passwordErrors });
      return;
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setErrors({ general: "Please enter a valid email address" });
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          total_movies: 0,
          total_duration: 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors({ password: data.errors });
        } else {
          setErrors({ general: data.message });
        }
        return;
      }

      // Save user data to context and local storage
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Navigate to home page
      navigate("/home");
    } catch (err) {
      setErrors({ general: "Signup failed. Please try again." });
      console.error("Signup error:", err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          Create a New Account
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter your name"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              placeholder="example@domain.com"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter your password"
            />
            <div className="mt-2 space-y-1">
              <p className={`text-xs ${passwordStrength.length ? 'text-green-400' : 'text-gray-400'}`}>
                ✓ At least 8 characters
              </p>
              <p className={`text-xs ${passwordStrength.uppercase ? 'text-green-400' : 'text-gray-400'}`}>
                ✓ At least one uppercase letter
              </p>
              <p className={`text-xs ${passwordStrength.lowercase ? 'text-green-400' : 'text-gray-400'}`}>
                ✓ At least one lowercase letter
              </p>
              <p className={`text-xs ${passwordStrength.number ? 'text-green-400' : 'text-gray-400'}`}>
                ✓ At least one number
              </p>
              <p className={`text-xs ${passwordStrength.special ? 'text-green-400' : 'text-gray-400'}`}>
                ✓ At least one special character
              </p>
            </div>
          </div>
          {errors.general && (
            <div className="mb-4 text-sm text-red-400 text-center">{errors.general}</div>
          )}
          {errors.password && (
            <div className="mb-4 text-sm text-red-400">
              <ul className="list-disc pl-5">
                {errors.password.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}