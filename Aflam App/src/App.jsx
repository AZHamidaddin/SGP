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
export default function App() {
  const [loading, setLoading] = useState(true); // State for handling loading status

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 2000); 
  }, []);

  return (
    <UserProvider>
      <Router>
        {loading ? (
          <div className="loading-screen flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black ">
          <p className="text-red-500 text-2xl font-semibold">Loading...</p>
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

            </Routes>
          </div>
        )}
      </Router>
    </UserProvider>
  );
}
