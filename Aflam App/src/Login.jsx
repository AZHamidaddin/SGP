import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "./UserContext";
import { Link } from "react-router-dom";
export default function Login() {
  const credentials = {
    Wael: { name: "Wael", email: "wael@gmail.com", password: "ps1", total_movies: 25, total_duration: 1000 },
    ahmed: { name: "Ahmed", email: "ahmed@gmail.com", password: "ps2", total_movies: 20, total_duration: 800 },
    ali: { name: "Ali", email: "ali@gmail.com", password: "ps3", total_movies: 15, total_duration: 500 },
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const userKey = Object.keys(credentials).find(
      (key) =>
        credentials[key].email === email && credentials[key].password === password
    );

    if (userKey) {
      setUser(credentials[userKey]); // set full user info
      navigate("/home");
    } else {
      setError("Incorrect email or password. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          Login to Your Account
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:ring-red-500 focus:border-red-500"
              placeholder="Enter your email"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:ring-red-500 focus:border-red-500"
              placeholder="Enter your password"
            />
          </div>
          {error && <div className="mb-4 text-sm text-red-400 text-center">{error}</div>}
          <button
            type="submit"
            className="w-full py-2 mb-4 text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-md transition duration-300"
          >
            Login
          </button>
          <Link
  to="/signup"
  className="block w-full py-2 mb-4 text-center text-white bg-purple-500 hover:bg-purple-800 rounded-lg shadow-md transition duration-300"
>
  Sign up
</Link>

        </form>
      </div>
    </div>
  );
}
