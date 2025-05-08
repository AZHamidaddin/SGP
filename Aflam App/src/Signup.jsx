import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "./UserContext";

/**
 * Signup Component
 * 
 * This is the page where new users can create an account. It includes:
 * - A form with fields for name, email, and password
 * - Password strength indicators that update in real-time
 * - Form validation to make sure all inputs are correct
 * - Connection to our database through API calls
 * 
 * HOW THIS WORKS:
 * 1. User fills out the form
 * 2. We check if all information is valid
 * 3. If valid, we send the data to our server
 * 4. If successful, we log the user in and go to the home page
 * 5. If there are errors, we show helpful messages
 */
export default function Signup() {
  // UserContext lets us share user data across the entire app
  // setUser is a function that updates the global user data
  const { setUser } = useContext(UserContext);

  // useNavigate is a React Router hook that lets us change pages programmatically
  // (we'll use this to redirect the user after successful signup)
  const navigate = useNavigate();

  // State variables store data that can change over time
  // When these change, React automatically updates the UI

  // These store what the user types in each form field
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // This stores any error messages to show to the user
  const [errors, setErrors] = useState({});

  // This tracks which password requirements have been met
  // Each property is true/false based on whether that requirement is satisfied
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,      // Must be at least 8 characters
    uppercase: false,   // Must have at least one uppercase letter
    lowercase: false,   // Must have at least one lowercase letter
    number: false,      // Must have at least one number
    special: false      // Must have at least one special character
  });

  // This controls whether the password is shown as text or hidden as dots
  // Toggle button lets users see what they're typing
  const [passwordVisible, setPasswordVisible] = useState(false);

  /**
   * validatePassword Function
   * 
   * This checks if the password meets all security requirements (real-time for frontend)
   * 
   * HOW IT WORKS:
   * 1. Takes a password string as input
   * 2. Tests the password against different requirements using regular expressions
   *    - Regular expressions (regex) are patterns that check for specific characters
   * 3. Updates the passwordStrength state with true/false for each requirement
   * 4. The UI will show green checkmarks for requirements that are met
   */
  const validatePassword = (password) => {
    setPasswordStrength({
      length: password.length >= 8,                      // Check if password is 8+ characters
      uppercase: /[A-Z]/.test(password),                 // Check for uppercase letters (A-Z)
      lowercase: /[a-z]/.test(password),                 // Check for lowercase letters (a-z)
      number: /[0-9]/.test(password),                    // Check for numbers (0-9)
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)   // Check for special characters
    });
  };

  /**
   * handlePasswordChange Function
   * 
   * This runs every time the user types in the password field
   * 
   * HOW IT WORKS:
   * 1. Gets the new password value from the input field
   * 2. Updates the password state with this new value
   * 3. Calls validatePassword to check requirements in real-time
   * 4. As user types, they'll see which requirements are being met
   */
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;  // Get what the user typed
    setPassword(newPassword);            // Update the password state
    validatePassword(newPassword);       // Check and update the strength indicators
  };

  /**
   * handleSubmit Function
   * 
   * This is called when the user clicks the Sign Up button
   * It handles the entire signup process
   * 
   * HOW IT WORKS:
   * 1. Prevents the default form submit behavior (page refresh)
   * 2. Checks all form fields for validity
   * 3. If everything is valid, sends data to the server
   * 4. Handles the server response (success or error)
   * 
   * The "async" keyword means this function can wait for operations to complete
   * (like waiting for the server to respond) without freezing the page
   */
  const handleSubmit = async (e) => {
    e.preventDefault();  // Stop the form from refreshing the page
    setErrors({});       // Clear any previous error messages

    // STEP 1: Check if any fields are empty
    if (!name || !email || !password) {
      setErrors({ general: "Please fill in all fields." });
      return;  // Stop execution if any field is empty
    }

    // STEP 2: Validate the password format
    // Create an object to track which requirements are met
    const passwordValidation = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    // Check if ALL password requirements are met (.every() returns true only if all values are true)
    if (!Object.values(passwordValidation).every(Boolean)) {
      // If not all requirements are met, create specific error messages
      const passwordErrors = [];
      if (!passwordValidation.length) passwordErrors.push("Password must be at least 8 characters long");
      if (!passwordValidation.uppercase) passwordErrors.push("Password must contain at least one uppercase letter");
      if (!passwordValidation.lowercase) passwordErrors.push("Password must contain at least one lowercase letter");
      if (!passwordValidation.number) passwordErrors.push("Password must contain at least one number");
      if (!passwordValidation.special) passwordErrors.push("Password must contain at least one special character");

      // Set the error messages and stop execution
      setErrors({ password: passwordErrors });
      return;
    }

    // STEP 3: Validate email format using regular expression
    // This regex checks for a standard email format (something@domain.extension)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setErrors({ general: "Please enter a valid email address" });
      return;
    }

    // STEP 4: If all validation passes, send data to the server
    try {
      // fetch is a built-in function for making HTTP requests
      // It sends our user data to the server and waits for a response
      const response = await fetch("http://localhost:5000/api/users", {
        method: "POST",  // POST is used to create new data
        headers: {
          "Content-Type": "application/json",  // Tell the server we're sending JSON
        },
        body: JSON.stringify({  // Convert our data object to a JSON string
          name,
          email,
          password,
          total_movies: 0,  // Initialize user's movie count stat
          total_duration: 0,  // Initialize user's watch time stat
        }),
      });

      // Parse the JSON response from the server
      const data = await response.json();

      // STEP 5: Handle the server response
      if (!response.ok) {  // If status code is not 2xx (success)
        // Show appropriate error messages
        if (data.errors) {
          setErrors({ password: data.errors });
        } else {
          setErrors({ general: data.message });
        }
        return;
      }

      // STEP 6: If signup was successful:
      // 1. Save the user data to our global context so other components can access it
      setUser(data.user);

      // 2. Also save to localStorage so user stays logged in if they refresh the page
      localStorage.setItem("user", JSON.stringify(data.user));

      // 3. Redirect the user to the home page
      navigate("/home");
    } catch (err) {
      // This catches any network errors or unexpected problems
      setErrors({ general: "Signup failed. Please try again." });
      console.error("Signup error:", err);  // Log details to console for debugging
    }
  };

  /**
   * togglePasswordVisibility Function
   * 
   * This controls whether the password is shown as plain text or hidden as dots
   * 
   * HOW IT WORKS:
   * 1. When called, it flips the current state (true becomes false, false becomes true)
   * 2. The input field type changes between "password" and "text" based on this state
   */
  const togglePasswordVisibility = () => {
    setPasswordVisible(prevState => !prevState);  // Flip the current value
  };

  // The return statement defines what HTML should be rendered on the screen
  return (
    // Main container - a full-screen box with a dark gradient background
    // flex centers everything both horizontally and vertically
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
      {/* Signup form card - a white box with rounded corners and shadow */}
      <div className="w-full max-w-md p-8 bg-gray-800 shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          Create a New Account
        </h2>
        {/* Form element - handles the submit event */}
        <form onSubmit={handleSubmit}>
          {/* Name input field group */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              Name
            </label>
            <input
              type="text"  // Text input type
              id="name"    // Connects the input to its label
              value={name} // Controlled input - value comes from state
              onChange={(e) => setName(e.target.value)}  // Update state when user types
              className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter your name"  // Hint text shown when field is empty
            />
          </div>

          {/* Email input field group - same pattern as name */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email Address
            </label>
            <input
              type="email"  // Email input type (enables email-specific keyboard on mobile)
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              placeholder="example@domain.com"
            />
          </div>

          {/* Password input field group with visibility toggle and strength indicators */}
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            {/* Relative positioning allows us to place the eye icon inside the input */}
            <div className="relative">
              <input
                // Type changes between "password" (dots) and "text" (visible) based on state
                type={passwordVisible ? "text" : "password"}
                id="password"
                value={password}
                onChange={handlePasswordChange}  // Special handler for password to check strength
                className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter your password"
              />
              {/* Button to toggle password visibility (the eye icon) */}
              <button
                type="button"  // Prevents form submission when clicked
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-600"
              >
                {/* Show different SVG icon based on visibility state */}
                {passwordVisible ? (
                  // Eye icon when password is visible
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M12 5C7.03 5 4 7.93 4 12s3.03 7 8 7 8-3.93 8-7-3.03-7-8-7zM12 17c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"></path>
                  </svg>
                ) : (
                  // Crossed-out eye icon when password is hidden
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M12 5c-4.97 0-8 3.93-8 7s3.03 7 8 7 8-3.93 8-7-3.03-7-8-7zm0 12c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"></path>
                  </svg>
                )}
              </button>
            </div>

            {/* Password strength requirement indicators */}
            {/* Each line changes color from gray to green when that requirement is met */}
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

          {/* Error Messages Section */}

          {/* General error message (for overall issues) */}
          {errors.general && (
            <div className="mb-4 text-sm text-red-400 text-center">{errors.general}</div>
          )}

          {/* Password-specific errors (displayed as a bullet list) */}
          {errors.password && (
            <div className="mb-4 text-sm text-red-400">
              <ul className="list-disc pl-5">
                {/* Map through each error in the array and create a list item */}
                {errors.password.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"  // This triggers the form's onSubmit event
            className="w-full px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}
