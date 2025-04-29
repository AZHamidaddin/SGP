import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const normalize = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, "").trim() || "";

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

const MovieGrid = () => {
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
    return (
      <div className="flex items-center justify-center h-60 text-white">
        <p className="text-xl font-semibold">Loading movies...</p>
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-white">
        <h2 className="text-2xl font-semibold">No movies available.</h2>
      </div>
    );
  }

  const previewMovies = movies.slice(0, 6); // Limit to 5

  return (
    <div className="bg-gray-900 text-white py-10">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-bold mb-8 text-center">Now Showing</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {previewMovies.map((group, index) => {
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

        {/* Show All Button */}
        <div className="mt-10 text-center">
          <Link
            to="/movies"
            className="inline-block bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Show All Movies
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MovieGrid;
