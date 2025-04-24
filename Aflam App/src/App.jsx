import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { UserProvider } from "./UserContext"; // Import the UserProvider
import Login from "./Login";
import Home from "./Home";
import MovieDetail from "./MovieDetail";
import Team from "./Team";
import GenreRecommender from "./GenreRecommender";
import AllMovies from "./AllMovies";
import AllOffers from "./AllOffers";
export default function App() {
  return (
    // Wrap the entire Router with UserProvider
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/movie/:movie_id" element={<MovieDetail />} />
          <Route path="/movies" element={<AllMovies />} />
          

        <Route path="/offers" element={<AllOffers />} />

          <Route path="/aboutus" element={<Team/>} />
          <Route path="/recommend" element={<GenreRecommender/>} />
        </Routes>
      </Router>
    </UserProvider>
  );
}
