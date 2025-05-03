import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { UserProvider } from "./UserContext"; // Import the UserProvider
import { ClipLoader } from 'react-spinners'; // Import ClipLoader for loading animation
import Login from "./Login";
import Home from "./Home";
import MovieDetail from "./MovieDetail";
import Team from "./Team";
import GenreRecommender from "./GenreRecommender";
import AllMovies from "./AllMovies";
import AllOffers from "./AllOffers";
import Signup from "./Signup";
import WatchedHistory from "./WatchedHistory";
import SuperAdmin from "./SuperAdmin";
export default function App() {
  const [loading, setLoading] = useState(true); // State for handling loading status

  // Simulate a delay for loading data (can be removed in real usage)s
  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 2000); // Simulate 2-second loading time
  }, []);

  return (
    <UserProvider>
      <Router>
        {loading ? (
          <div className="loading-screen flex items-center justify-center h-screen bg-gradient-to-r from-red-500 via-pink-500 to-red-500">
            <p className="text-white text-2xl font-semibold">Loading...</p>
          </div>
        ) : (
          <div className="min-h-screen bg-gray-900">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/movie/:movie_id" element={<MovieDetail />} />
              <Route path="/movies" element={<AllMovies />} />
              <Route path="/offers" element={<AllOffers />} />
              <Route path="/aboutus" element={<Team />} />
              <Route path="/recommend" element={<GenreRecommender />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/history" element={<WatchedHistory />} />
              <Route path="/superadmin" element={<SuperAdmin />} />

            </Routes>
          </div>
        )}
      </Router>
    </UserProvider>
  );
}
