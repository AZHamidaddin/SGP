import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";


// This function normalizes a string by:
// - Converting to lowercase
// - Removing all special characters (keeping only letters and numbers)
// - Trimming whitespace
// - Returns empty string if input is null/undefined
const normalize = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, "").trim() || "";

// Hmm, this function takes a group of movies and a priority list of sources
// It tries to find the best quality movie poster by checking each source in order
// If it can't find any of the preferred sources, it just uses the first movie's image
// Pretty handy for making sure we show the nicest poster we have!
const getPrioritizedImageUrl = (group, priority) => {
  // Find the image based on priority
  for (const sourceName of priority) {
    // Check the 'Parent' field for the source name
    const movie = group.find(m => m.Parent?.toUpperCase() === sourceName.toUpperCase());
    if (movie && movie["Image URL"]) {
      return movie["Image URL"];
    }
  }
  // Fallback to the first movie's image URL if no prioritized source is found or if the group is empty
  return group[0]?.["Image URL"] || ""; // Use optional chaining and provide a default empty string
};

// This function groups similar movies together based on their titles
// For example, "Spider-Man" and "Spider-Man 2" would be in the same group
// It also sorts the groups alphabetically by title
// Really useful for showing all versions of a movie together on the grid!
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
  const [imageAspectRatios, setImageAspectRatios] = useState({}); // State for image aspect ratios

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

  // Handler for image loading
  const handleImageLoad = (event, url) => {
    const { naturalWidth, naturalHeight } = event.target;
    if (naturalHeight > 0) { // Avoid division by zero
      const aspectRatio = naturalWidth / naturalHeight;
      setImageAspectRatios(prev => ({ ...prev, [url]: aspectRatio }));
    } else {
      // Handle cases where height is 0 or image fails to load dimension data
      setImageAspectRatios(prev => ({ ...prev, [url]: 1 })); // Default to aspect ratio 1 (square-ish)
    }
  };

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

  const previewMovies = movies.slice(0, 8); // Limit to 5

  return (
    <div className="bg-gray-900 text-white py-10">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-bold mb-8 text-center">Now Showing</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {previewMovies.map((group, index) => {
            const main = group[0];
            // Define the priority order for cinema sources
            const priority = ['VOX', 'Muvi', 'Empire', 'AMC'];
            // Get the image URL based on the defined priority
            const imageUrl = getPrioritizedImageUrl(group, priority);

            // Determine classes based on aspect ratio
            const aspectRatio = imageAspectRatios[imageUrl];
            let wrapperClass = 'h-[350px] w-full flex items-center justify-center bg-gray-800 rounded-t-lg overflow-hidden';
            let imageClass = '';

            if (aspectRatio === undefined) {
              wrapperClass += ' animate-pulse';
              imageClass = 'opacity-0';
            } else {
              imageClass = 'object-contain w-full h-full'; // Always contain image fully
            }


            return (
              <div
                key={index}
                className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform relative flex flex-col h-[500px]"
              >
                {/* Image Wrapper for consistent aspect ratio and centering */}
                <div className={wrapperClass}>
                  <img
                    src={imageUrl} // Use the prioritized image URL
                    alt={main.Title}
                    onLoad={(e) => handleImageLoad(e, imageUrl)} // Add onLoad handler
                    className={`transition-opacity duration-300 ${imageClass}`} // Apply dynamic class for img content
                  />
                </div>
                {/* Text Content */}
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold">{main.Title}</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {main.Language?.charAt(0).toUpperCase() +
                      main.Language?.slice(1).toLowerCase()}
                  </p>

                  <Link
                    to={`/movie/${main._id}`}
                    className="mt-auto inline-block w-full bg-blue-600 hover:bg-blue-500 text-white text-center font-semibold py-2 rounded-lg transition"
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
