import React, { useContext } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MovieGrid from "./MovieGrid";
import SearchMovies from "./SearchMovies";
import OffersList from "./OffersList";
import UserInfo from "./UserInfo";
import { UserContext } from "./UserContext";
import { Link } from "react-router-dom";

export default function Home() {
  const { user } = useContext(UserContext); // Access user from context
  const location = useLocation(); // get the current path



  return (
    <div className="min-h-screen bg-gradient-to-r from-red-500 via-pink-500 to-red-500 text-white">
      <Navbar />

      {/* Show user info only if logged in */}
      {user && <UserInfo />}


      {/* Sticky button */}
      <Link
        to="/recommend"
        className="fixed bottom-4 right-4 z-50 bg-white text-red-600 font-semibold py-3 px-6 rounded-full shadow-xl hover:bg-red-100 transition duration-300 dark:bg-pink-800 dark:text-white dark:hover:bg-red-700"
      >
        Recommend a movie
      </Link>
      <MovieGrid />


      <OffersList />

      <Footer />
    </div>
  );
}
