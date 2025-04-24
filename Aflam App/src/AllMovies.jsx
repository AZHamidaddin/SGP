import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SearchMovies from "./SearchMovies";
import Navbar from "./Navbar";

// Utility function to normalize movie titles
const normalize = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, "").trim() || "";

// Merge movies based on similar titles
const mergeMoviesByTitle = (movies) => {
  const groups = [];
  const visited = new Set();

  for (let i = 0; i < movies.length; i++) {
    if (visited.has(i)) continue;

    const group = [movies[i]];
    visited.add(i);
    const titleA = normalize(movies[i].Title);

    for (let j = i + 1; j < movies.length; j++) {
      if (visited.has(j)) continue;

      const titleB = normalize(movies[j].Title);

      if (titleA.includes(titleB) || titleB.includes(titleA)) {
        group.push(movies[j]);
        visited.add(j);
      }
    }

    groups.push(group);
  }

  return groups.sort((a, b) =>
    a[0].Title.localeCompare(b[0].Title, undefined, { sensitivity: "base" })
  );
};

const AllMovies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/movies")
      .then((res) => res.json())
      .then((data) => {
        const grouped = mergeMoviesByTitle(data || []);
        setMovies(grouped);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center text-white py-20">Loading all movies...</div>;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Full-width Navbar */}
      <div className="w-full bg-gray-950 shadow-md">
        <Navbar />
      </div>

      <div className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center">All Movies</h1>
        <SearchMovies />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
          {movies.map((group, index) => {
            const main = group[0];
            return (
              <div
                key={index}
                className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform"
              >
                <img
                  src={main["Image URL"]}
                  alt={main.Title}
                  className="w-full h-56 object-contain bg-gray-800 rounded-t-lg"
                />
                <div className="p-5">
                  <h3 className="text-lg font-bold">{main.Title}</h3>
                  <p className="text-sm text-gray-400">
                    {main.Language?.charAt(0).toUpperCase() +
                      main.Language?.slice(1).toLowerCase()}
                  </p>
                  <Link
                    to={`/movie/${main._id}`}
                    className="mt-3 inline-block w-full bg-blue-600 hover:bg-blue-500 text-white text-center font-semibold py-2 rounded-lg transition"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Back to Home Button */}
        <div className="mt-12 text-center">
          <Link
            to="/"
            className="inline-block bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AllMovies;
