import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

// This function normalizes a string by:
// - Converting to lowercase
// - Removing all special characters (keeping only letters and numbers)
// - Trimming whitespace
// - Returns empty string if input is null/undefined
const normalize = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, "").trim() || "";

// This function groups movies together based on title inclusion/similarity
// For example: "Spider-Man" and "Spider-Man 2" would be grouped together
// It takes an array of movie objects and returns an array of movie groups
// Each group contains movies whose normalized titles are substrings of each other
// The normalization removes special characters and converts to lowercase
const groupMoviesByInclusion = (movies) => {
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

  return groups;
};

const MovieDetail = () => {
  const { movie_id } = useParams();
  const [movieGroup, setMovieGroup] = useState(null);
  const [mainMovie, setMainMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedCinema, setSelectedCinema] = useState("All Cinemas");
  const [cities, setCities] = useState([]);
  const [imdbRating, setImdbRating] = useState(null);
  const navigate = useNavigate();
  const [cinemas, setCinemas] = useState([]);
  const [imageAspectRatio, setImageAspectRatio] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/movies")
      .then((res) => res.json())
      .then((data) => {
        const grouped = groupMoviesByInclusion(data || []);
        const matchedGroup = grouped.find((group) =>
          group.some((m) => m._id === movie_id)
        );

        if (!matchedGroup) return setLoading(false);

        const mergedTimings = matchedGroup.flatMap((m) => m.Timings || []);
        const primary = matchedGroup.find((m) => m._id === movie_id) || matchedGroup[0];

        setMainMovie({ ...primary, Timings: mergedTimings });
        setMovieGroup(matchedGroup);

        const citySet = new Set();
        mergedTimings.forEach((timing) => {
          timing.Showtimes?.forEach((show) => {
            if (show.City) citySet.add(show.City);
          });
        });

        const sortedCities = Array.from(citySet).sort((a, b) => {
          if (a === "Jeddah") return -1;
          if (b === "Jeddah") return 1;
          if (a === "Riyadh") return -1;
          if (b === "Riyadh") return 1;
          return a.localeCompare(b);
        });

        const parentCinemas = Array.from(
          new Set(matchedGroup.map((m) => m.Parent).filter(Boolean))
        );

        setCities(sortedCities);
        setCinemas(["All Cinemas", ...parentCinemas]);

        // Fetch IMDB rating
        if (primary.Title) {
          fetch(`http://www.omdbapi.com/?t=${encodeURIComponent(primary.Title)}&apikey=d850d051`)
            .then(res => res.json())
            .then(data => {
              if (data.imdbRating && data.imdbRating !== "N/A") {
                setImdbRating(data.imdbRating);
              }
            })
            .catch(err => console.error("Error fetching IMDB rating:", err));
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching movie:", err);
        setLoading(false);
      });
  }, [movie_id]);

  const getParentByPlace = (place) => {
    const matched = movieGroup?.find((m) =>
      m.Timings?.some((t) =>
        t.Showtimes?.some((s) => s.Place === place)
      )
    );
    return matched?.Parent || "";
  };

  const getParentBadge = (place) => {
    const matched = movieGroup?.find((m) =>
      m.Timings?.some((t) =>
        t.Showtimes?.some((s) => s.Place === place && s.City)
      )
    );

    let parent = matched?.Parent;

    // Fallback logic based on Place name
    if (!parent) {
      const lower = place.toLowerCase();
      if (lower.includes("amc")) parent = "AMC";
      else if (lower.includes("muvi")) parent = "Muvi";
      else if (lower.includes("vox")) parent = "Vox";
      else if (lower.includes("empire")) parent = "Empire";
    }

    const badgeColor =
      parent?.toLowerCase() === "muvi"
        ? "bg-pink-600"
        : parent?.toLowerCase() === "empire"
          ? "bg-amber-900"
          : parent?.toLowerCase() === "amc"
            ? "bg-red-600"
            : parent?.toLowerCase() === "vox"
              ? "bg-blue-600"
              : "bg-gray-600";

    return parent ? (
      <span
        className={`inline-block ml-2 px-3 py-1 rounded-full text-xs font-medium text-white ${badgeColor}`}
      >
        {parent}
      </span>
    ) : (
      <span className="inline-block ml-2 px-3 py-1 rounded-full text-xs font-medium text-white bg-gray-600">
        Unknown
      </span>
    );
  };

  // Handler for image load
  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.target;
    if (naturalHeight > 0) {
      setImageAspectRatio(naturalWidth / naturalHeight);
    }
  };

  // Determine image width class based on aspect ratio
  const WIDE_ASPECT_RATIO_THRESHOLD = 2.0; // Example threshold (Width > 2 * Height)
  const isWideImage = imageAspectRatio !== null && imageAspectRatio > WIDE_ASPECT_RATIO_THRESHOLD;
  const imageWidthClass = isWideImage
    ? 'md:w-2/3 lg:w-1/2 xl:w-3/5' // Larger width for wide images
    : 'md:w-1/3 lg:w-1/4';        // Default width

  if (loading) {
    return (
      <div className="loading-screen flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        {/* Simple Spinner */}
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500 mb-4"></div>
        <p className="text-xl font-semibold text-gray-300">Loading Movie Details...</p>
      </div>
    );
  }

  if (!mainMovie) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white bg-gray-900 px-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-400 font-bold text-xl mb-4 text-center">Oops! Movie Not Found</p>
        <p className="text-gray-400 text-center mb-6">We couldn't find the details for this movie. It might have been removed or the link is incorrect.</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold shadow-md transition duration-200 ease-in-out transform hover:scale-105"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const availableDates = Array.from(
    new Set(mainMovie.Timings?.map((t) => t.Date))
  );

  const availableCinemas =
    selectedCity && selectedDate && mainMovie.Timings
      ? mainMovie.Timings
        // First, we only keep the movie times for the day you picked
        .filter((t) => t.Date === selectedDate)
        // Then, we make a list of all the showtimes for that day
        .flatMap((t) => t.Showtimes || [])
        // Finally, we look at each showtime and check if it matches what you want
        .filter((s) => {
          const cityMatch =
            !selectedCity || s.City.toLowerCase() === selectedCity.toLowerCase();
          const cinemaMatch =
            selectedCinema === "All Cinemas" ||
            getParentByPlace(s.Place) === selectedCinema;
          return cityMatch && cinemaMatch;
        })
        .reduce((acc, show) => {
          const key = `${show.Place}-${show.City}`;
          const existing = acc.find((s) => `${s.Place}-${s.City}` === key);

          if (existing) {
            show.Experiences.forEach((exp) => {
              const existingExp = existing.Experiences.find(
                (e) => e.Experience === exp.Experience
              );
              if (existingExp) {
                existingExp.Times = Array.from(
                  new Set([...existingExp.Times, ...exp.Times])
                );
              } else {
                existing.Experiences.push(exp);
              }
            });
          } else {
            acc.push({ ...show, Experiences: [...show.Experiences] });
          }

          return acc;
        }, [])
      : [];

  return (
    <div className="bg-gray-900 text-white min-h-screen py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 md:mb-12 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-red-500">
          {mainMovie.Title}
        </h1>

        <div className="mt-8 flex flex-col md:flex-row items-start md:gap-12">
          <img
            src={mainMovie["Image URL"]}
            alt={mainMovie.Title}
            className={`w-full h-auto object-contain rounded-lg shadow-xl mb-6 md:mb-0 flex-shrink-0 ${imageWidthClass}`}
            onLoad={handleImageLoad}
          />
          <div className="flex-grow">
            <p className="text-lg text-gray-300 mb-4">{mainMovie.Description || "No description available."}</p>
            <div className="space-y-2 text-gray-400 mb-6">
              <p>
                <strong>Classification:</strong> <span className="text-gray-200">{mainMovie.Rating}</span>
              </p>
              <p>
                <strong>Language:</strong> <span className="text-gray-200">{mainMovie.Language}</span>
              </p>
              <p>
                <strong>Genre:</strong>{" "}
                {Array.isArray(mainMovie.Genre) &&
                  mainMovie.Genre.map((genre, index) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-700 text-pink-400 px-2 py-0.5 rounded-md text-sm mr-2 mb-1"
                    >
                      {genre}
                    </span>
                  ))}
              </p>
              {imdbRating && (
                <p>
                  <strong>IMDB Rating:</strong>{" "}
                  <span className="text-yellow-400 font-semibold">⭐ {imdbRating}/10</span>
                </p>
              )}
            </div>
            <div className="flex justify-start mt-6">
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold shadow-md transition duration-200 ease-in-out transform hover:scale-105"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Cinema Selector */}
        {cinemas.length > 0 && (
          <div className="mt-10">
            <h2 className="text-3xl font-semibold mb-4 text-gray-100">Select Cinema</h2>
            <div className="flex overflow-x-auto space-x-4 py-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {cinemas.map((cinema) => (
                <button
                  key={cinema}
                  className={`px-5 py-2.5 rounded-md text-sm font-semibold whitespace-nowrap transition duration-200 ease-in-out border ${selectedCinema === cinema
                    ? "bg-pink-600 text-white border-pink-600 shadow-md"
                    : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:border-gray-500"
                    }`}
                  onClick={() => setSelectedCinema(cinema)}
                >
                  {cinema}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* City Selector */}
        {cities.length > 0 && (
          <div className="mt-10">
            <h2 className="text-3xl font-semibold mb-4 text-gray-100">Select City</h2>
            <div className="flex overflow-x-auto space-x-4 py-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {cities.map((city) => (
                <button
                  key={city}
                  className={`px-5 py-2.5 rounded-md text-sm font-semibold whitespace-nowrap transition duration-200 ease-in-out border ${selectedCity === city
                    ? "bg-pink-600 text-white border-pink-600 shadow-md"
                    : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:border-gray-500"
                    }`}
                  onClick={() => setSelectedCity(city)}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date Selector */}
        {selectedCity && availableDates.length > 0 && (
          <div className="mt-10">
            <h2 className="text-3xl font-semibold mb-4 text-gray-100">Select Date</h2>
            <div className="flex overflow-x-auto space-x-4 py-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {availableDates
                .filter((date) => new Date(date) >= new Date(new Date().toDateString()))
                .map((date) => {
                  const today = new Date();
                  const showDate = new Date(date);

                  const isToday =
                    today.toDateString() === showDate.toDateString();

                  const label = showDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  }) + (isToday ? " (Today)" : "");

                  return (
                    <button
                      key={date}
                      className={`px-5 py-2.5 rounded-md text-sm font-semibold whitespace-nowrap transition duration-200 ease-in-out border ${selectedDate === date
                        ? "bg-pink-600 text-white border-pink-600 shadow-md"
                        : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:border-gray-500"
                        }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      {label}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Showtimes */}
        {selectedCity && selectedDate && availableCinemas.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-semibold mb-6 text-gray-100">Showtimes</h2>
            <div className="p-6 md:p-8 bg-gray-800 rounded-lg border border-gray-700 shadow-lg">
              {availableCinemas.map((cinema) => (
                <div key={`${cinema.Place}-${cinema.City}`} className="mb-8 last:mb-0">
                  <div className="flex items-center space-x-3 mb-4">
                    <h3 className="text-xl font-semibold text-pink-400">
                      {cinema.Place} - {cinema.City}
                    </h3>
                    {getParentBadge(cinema.Place)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                    {cinema.Experiences.map((exp) => (
                      <div key={exp.Experience}>
                        <h4 className="text-lg font-semibold text-gray-200 mb-2">
                          {exp.Experience}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {exp.Times.map((time) => {
                            const matchedMovie = movieGroup.find((m) =>
                              m.Timings?.some((t) =>
                                t.Showtimes?.some(
                                  (s) =>
                                    s.Place === cinema.Place &&
                                    s.City === cinema.City
                                )
                              )
                            );

                            const showtimeUrl =
                              matchedMovie?.["Showtimes URL"] || "#";
                            const parent = matchedMovie?.Parent?.toLowerCase();

                            let fullUrl = showtimeUrl;
                            if (parent === "amc") {
                              fullUrl = "https://www.amccinemas.com" + showtimeUrl;
                            } else if (parent === "vox") {
                              fullUrl = "https://ksa.voxcinemas.com" + showtimeUrl;
                            } else if (parent === "muvi") {
                              fullUrl = "https://www.muvicinemas.com" + showtimeUrl;
                            }

                            return (
                              <a
                                key={time}
                                href={fullUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-pink-600 transition duration-200 ease-in-out text-sm font-medium shadow-sm"
                              >
                                {time}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetail;
