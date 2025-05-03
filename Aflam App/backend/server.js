require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors()); // Allows frontend to call the API
app.use(express.json()); // Parses JSON request bodies

// ✅ MongoDB Connection
// ✅ MongoDB Connection (Updated)
mongoose.connect(process.env.MONGO_URI, {
  dbName: "AflamDB"  // Explicitly select the database
})
  .then(() => {
    console.log("✅ MongoDB Connected to AflamDB");

    // Print all database objects on server start
    printAllDatabaseObjects();
  })
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Function to print all database objects
async function printAllDatabaseObjects() {
  try {
    console.log("\n🔍 PRINTING ALL DATABASE OBJECTS ON SERVER START 🔍");

    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log(`Found ${collectionNames.length} collections: ${collectionNames.join(', ')}`);

    // Loop through each collection and count documents
    let totalDocuments = 0;
    for (const collectionName of collectionNames) {
      const count = await mongoose.connection.db.collection(collectionName).countDocuments();
      console.log(`Collection '${collectionName}': ${count} documents`);
      totalDocuments += count;

      // Print first document as sample (if exists)
      if (count > 0) {
        const sampleDoc = await mongoose.connection.db.collection(collectionName).findOne();
        console.log(`Sample document from '${collectionName}':`);
        console.log(JSON.stringify(sampleDoc, null, 2));
        console.log("-------------------------------------");
      }
    }

    console.log(`Total documents across all collections: ${totalDocuments}`);
    console.log("🔍 DATABASE PRINT COMPLETE 🔍\n");
  } catch (error) {
    console.error("Error printing database objects on startup:", error);
  }
}





// ✅ Define Movie Schema (Matches Your MongoDB Structure)
const MovieSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  identifier: { type: String, required: true, unique: true },
  Title: { type: String, required: true },
  description: { type: String, default: "" },
  image_url: { type: String, required: true },
  classification: { type: String, required: true },
  language: { type: String, required: true },
  showtimes_url: { type: String },

  // Stores dynamic dates with day_of_week and showtimes array
  timings: {
    type: Map,
    of: new mongoose.Schema({
      day_of_week: { type: String, required: true },
      showtimes: [
        {
          place: { type: String, required: true },
          experiences: [
            {
              name: { type: String, required: true },
              times: [{ type: String }]
            }
          ]
        }
      ]
    })
  }
});

const Movie = mongoose.model("Movie", MovieSchema);

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  total_movies: { type: Number, default: 0 },
  total_duration: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  userViewHistory: {
    type: [
      {
        _id: String,
        Title: String,
        Language: String,
        Parent: String,
        image_url: String,
        date: String
      }
    ],
    default: []
  }, // Array of movie titles the user has watched
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);

// ✅ API Endpoints

// 1️⃣ Get All Movies

app.get("/test", async (req, res) => {
  try {
    const testData = await Movie.findOne();
    res.json(testData || { message: "No movies found in database!" });
  } catch (error) {
    res.status(500).json({ error: "Database connection error" });
  }
});

// Search movies by title or description
app.get("/movies/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Create a case-insensitive search regex
    const searchRegex = new RegExp(query, 'i');

    // Search in title and description fields
    const movies = await Movie.find({
      $or: [
        { title: searchRegex },
        { description: searchRegex }
      ]
    });

    res.json(movies);
  } catch (error) {
    console.error("Error searching movies:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// 2️⃣ Get Movies by Date
app.get("/movies/date/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const movies = await Movie.find({ [`timings.${date}`]: { $exists: true } });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 3️⃣ Get Movies by Cinema Name
app.get("/movies/cinema/:cinema", async (req, res) => {
  try {
    const { cinema } = req.params;
    const movies = await Movie.find({ [`timings.*.showtimes.place`]: cinema });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Get all movies
app.get("/movies", async (req, res) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Get a specific movie by slug
app.get("/movies/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const movie = await Movie.findOne({ slug });

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json(movie);
  } catch (error) {
    console.error("Error fetching movie by slug:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/debug", async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const moviesCount = await Movie.countDocuments();

    res.json({
      collections: collections.map(col => col.name), // Shows all collection names
      moviesInDatabase: moviesCount // Shows how many movies exist
    });
  } catch (error) {
    res.status(500).json({ error: "Database connection error", details: error });
  }
});

app.get("/debug-movies", async (req, res) => {
  try {
    const testData = await mongoose.connection.db.collection("movies").findOne();
    console.log("Fetched from MongoDB:", testData);
    res.json(testData || { message: "No movies found in database!" });
  } catch (error) {
    res.status(500).json({ error: "Database connection error", details: error });
  }
});

// Create a new movie
app.post("/movies", async (req, res) => {
  try {
    const movieData = req.body;

    // Validate required fields
    if (!movieData.title || !movieData.slug || !movieData.identifier || !movieData.image_url ||
      !movieData.classification || !movieData.language) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["title", "slug", "identifier", "image_url", "classification", "language"]
      });
    }

    // Check if movie with same slug or identifier already exists
    const existingMovie = await Movie.findOne({
      $or: [{ slug: movieData.slug }, { identifier: movieData.identifier }]
    });

    if (existingMovie) {
      return res.status(409).json({
        error: "Movie with this slug or identifier already exists"
      });
    }

    // Create and save the new movie
    const newMovie = new Movie(movieData);
    await newMovie.save();

    res.status(201).json(newMovie);
  } catch (error) {
    console.error("Error creating movie:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});



// Print all database objects to console
app.get("/print-all-data", async (req, res) => {
  try {
    // Get all movies from the database
    const allMovies = await Movie.find();

    // Print the entire collection to console
    console.log("========== ALL DATABASE OBJECTS ==========");
    console.log(JSON.stringify(allMovies, null, 2));
    console.log("==========================================");

    // Count the number of documents
    const count = allMovies.length;
    console.log(`Total number of documents: ${count}`);

    // Return the data in the response as well
    res.json({
      message: `Successfully printed ${count} documents to console`,
      count: count,
      data: allMovies
    });
  } catch (error) {
    console.error("Error fetching all data:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Print all collections and their data
app.get("/print-all-collections", async (req, res) => {
  try {
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log("========== ALL DATABASE COLLECTIONS ==========");
    console.log("Collections found:", collectionNames);

    // Object to store all collection data
    const allData = {};
    let totalDocuments = 0;

    // Loop through each collection and get its data
    for (const collectionName of collectionNames) {
      const documents = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      allData[collectionName] = documents;

      // Print each collection's data
      console.log(`\n---------- COLLECTION: ${collectionName} (${documents.length} documents) ----------`);
      console.log(JSON.stringify(documents, null, 2));

      totalDocuments += documents.length;
    }

    console.log("\n==============================================");
    console.log(`Total collections: ${collectionNames.length}`);
    console.log(`Total documents across all collections: ${totalDocuments}`);

    // Return summary in the response
    res.json({
      message: `Successfully printed ${totalDocuments} documents from ${collectionNames.length} collections`,
      collections: collectionNames,
      documentCounts: Object.fromEntries(
        Object.entries(allData).map(([name, docs]) => [name, docs.length])
      ),
      data: allData
    });
  } catch (error) {
    console.error("Error fetching collections data:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Print all documents from a specific collection
app.get("/print-collection/:collectionName", async (req, res) => {
  try {
    const { collectionName } = req.params;

    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      return res.status(404).json({ error: `Collection '${collectionName}' not found` });
    }

    // Get all documents from the collection
    const documents = await mongoose.connection.db.collection(collectionName).find({}).toArray();

    // Print the collection data
    console.log(`\n========== COLLECTION: ${collectionName} (${documents.length} documents) ==========`);
    console.log(JSON.stringify(documents, null, 2));
    console.log("==============================================");

    // Return the data in the response
    res.json({
      message: `Successfully printed ${documents.length} documents from collection '${collectionName}'`,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    console.error(`Error fetching collection '${req.params.collectionName}':`, error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});



// Get all movies with Parent = "Empire"
app.get("/movies/parent/empire", async (req, res) => {
  try {
    // Find all movies where Parent field is "Empire"
    const empireMovies = await mongoose.connection.db.collection("movies").find({ Parent: "Empire" }).toArray();

    // Log the results
    console.log(`Found ${empireMovies.length} movies with Parent = "Empire"`);
    console.log(JSON.stringify(empireMovies, null, 2));

    // Return the movies
    res.json({
      count: empireMovies.length,
      movies: empireMovies
    });
  } catch (error) {
    console.error("Error fetching movies with Parent = Empire:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Get all movies with Parent = "AMC"
app.get("/movies/parent/amc", async (req, res) => {
  try {
    // Find all movies where Parent field is "AMC"
    const amcMovies = await mongoose.connection.db.collection("movies").find({ Parent: "AMC" }).toArray();

    // Log the results
    console.log(`Found ${amcMovies.length} movies with Parent = "AMC"`);
    console.log(JSON.stringify(amcMovies, null, 2));

    // Return the movies
    res.json({
      count: amcMovies.length,
      movies: amcMovies
    });
  } catch (error) {
    console.error("Error fetching movies with Parent = AMC:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Get all movies with Parent = "Vox"
app.get("/movies/parent/vox", async (req, res) => {
  try {
    // Find all movies where Parent field is "Vox"
    const voxMovies = await mongoose.connection.db.collection("movies").find({ Parent: "Vox" }).toArray();

    // Log the results
    console.log(`Found ${voxMovies.length} movies with Parent = "Vox"`);
    console.log(JSON.stringify(voxMovies, null, 2));

    // Return the movies
    res.json({
      count: voxMovies.length,
      movies: voxMovies
    });
  } catch (error) {
    console.error("Error fetching movies with Parent = Vox:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Get all movies with Parent = "Muvi"
app.get("/movies/parent/muvi", async (req, res) => {
  try {
    // Find all movies where Parent field is "Muvi"
    const muviMovies = await mongoose.connection.db.collection("movies").find({ Parent: "Muvi" }).toArray();

    // Log the results
    console.log(`Found ${muviMovies.length} movies with Parent = "Muvi"`);
    console.log(JSON.stringify(muviMovies, null, 2));

    // Return the movies
    res.json({
      count: muviMovies.length,
      movies: muviMovies
    });
  } catch (error) {
    console.error("Error fetching movies with Parent = Muvi:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Get all documents from the offers collection
app.get("/offers", async (req, res) => {
  try {
    // Check if offers collection exists
    const collections = await mongoose.connection.db.listCollections({ name: "offers" }).toArray();
    if (collections.length === 0) {
      return res.status(404).json({ error: "Offers collection not found in the database" });
    }

    // Fetch all documents from the offers collection
    const offers = await mongoose.connection.db.collection("offers").find({}).toArray();

    // Log the results
    console.log(`Found ${offers.length} documents in the offers collection`);
    console.log(JSON.stringify(offers, null, 2));

    // Return the offers
    res.json({
      count: offers.length,
      offers: offers
    });
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }

});

// Get a specific offer by ID
app.get("/offers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if offers collection exists
    const collections = await mongoose.connection.db.listCollections({ name: "offers" }).toArray();
    if (collections.length === 0) {
      return res.status(404).json({ error: "Offers collection not found in the database" });
    }

    // Try to convert the ID to an ObjectId if it's in that format
    let objectId;
    try {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        objectId = new mongoose.Types.ObjectId(id);
      }
    } catch (err) {
      // If conversion fails, we'll just use the string ID
      console.log("ID not in ObjectId format, using as string");
    }

    // Create a query that checks both _id formats
    const query = objectId ? { $or: [{ _id: objectId }, { _id: id }] } : { _id: id };

    // Find the offer
    const offer = await mongoose.connection.db.collection("offers").findOne(query);

    if (!offer) {
      return res.status(404).json({ error: `Offer with ID ${id} not found` });
    }

    // Log the result
    console.log(`Found offer with ID ${id}:`);
    console.log(JSON.stringify(offer, null, 2));

    // Return the offer
    res.json(offer);
  } catch (error) {
    console.error(`Error fetching offer with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Test endpoint to get user by email
app.get("/api/users/test/:email", async (req, res) => {
  try {
    console.log("Searching for user with email:", req.params.email);
    const user = await User.findOne({ email: req.params.email });
    console.log("Found user:", user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      total_movies: user.total_movies,
      total_duration: user.total_duration,
      isAdmin: user.isAdmin,
      created_at: user.created_at
    });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// User Login Endpoint
app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password (in a real app, you'd compare hashed passwords)
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    
    // Return user data (excluding password)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      total_movies: user.total_movies,
      total_duration: user.total_duration,
      isAdmin: user.isAdmin,
      userViewHistory: user.userViewHistory || [] // Include the watch history
    };

    res.json({ user: userData });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// Common password patterns to check against
const commonPasswords = [
  'password123', 'qwerty123', '12345678', 'password1', 'admin123',
  'letmein123', 'welcome123', 'monkey123', 'football123', 'abc123'
];

const isSequential = (str) => {
  const sequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789'];
  const len = 4; // minimum sequence length to check

  for (let seq of sequences) {
    for (let i = 0; i <= seq.length - len; i++) {
      const pattern = seq.slice(i, i + len);
      if (str.toLowerCase().includes(pattern)) return true;
    }
  }
  return false;
};

// User Registration Endpoint
app.post("/api/users", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Enhanced email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format. Please use a valid email address (e.g., example@domain.com)" });
    }

    // Enhanced password validation with strict checking
    const passwordErrors = [];

    if (password.length < 8) {
      passwordErrors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      passwordErrors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      passwordErrors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      passwordErrors.push("Password must contain at least one number");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      passwordErrors.push("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)");
    }

    // Check for common passwords
    if (commonPasswords.includes(password.toLowerCase())) {
      passwordErrors.push("This password is too common. Please choose a more unique password");
    }

    // Check for sequential patterns
    if (isSequential(password)) {
      passwordErrors.push("Password contains sequential patterns (e.g., abcd1234). Please choose a more random combination");
    }

    // Check if password contains personal information
    if (password.toLowerCase().includes(name.toLowerCase()) ||
      password.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
      passwordErrors.push("Password should not contain your name or email");
    }

    // If any password validation failed, return all errors
    if (passwordErrors.length > 0) {
      return res.status(400).json({ message: "Password validation failed", errors: passwordErrors });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password, // In a real application, you should hash the password
      total_movies: 0,
      total_duration: 0
    });

    await user.save();

    // Return user data (excluding password)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      total_movies: user.total_movies,
      total_duration: user.total_duration,
      isAdmin: user.isAdmin
    };

    res.status(201).json({ user: userData });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});


app.put('/movies/:id', async (req, res) => {
  const { id } = req.params; // Get the movie's _id from the URL
  const { Title, slug, identifier, parent, imageUrl, rating, language, description, genre, showtimesUrl, timings } = req.body;

  try {
    // Find and update the movie by _id
    const updatedMovie = await Movie.findByIdAndUpdate(
      id, // Use _id for the update
      {
        Title,            // Update the 'Title' field
        slug,
        identifier,
        parent,
        imageUrl,
        rating,
        language,
        description,
        genre,
        showtimesUrl,
        timings
      },
      { new: true, runValidators: true } // Return the updated movie and validate data
    );

    // If no movie was found with this _id
    if (!updatedMovie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // Return the updated movie
    res.status(200).json(updatedMovie); // Send the updated movie as a response
  } catch (error) {
    // Handle errors (e.g., validation errors)
    res.status(500).json({ message: error.message });
  }
});

// Add movie to user's watch history
app.post("/api/users/watch-history", async (req, res) => {
  try {
    const { userId, movie } = req.body;

    // Validate input
    if (!userId || !movie || !movie._id || !(movie.Title || movie.title)) {
      return res.status(400).json({ message: "User ID and movie object with at least _id and Title are required" });
    }

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if movie is already in user's watch history by title (or _id if you want)
    const alreadyExists = user.userViewHistory.some((m) => {
      return typeof m === 'object' && m._id === movie._id;
    });

    if (alreadyExists) {
      return res.status(400).json({ message: "Movie already in watch history" });
    }

    // Push the full movie object
    user.userViewHistory.push(movie);
    user.total_movies = user.userViewHistory.length;

    await user.save();

    res.status(200).json({
      message: "Movie added to watch history",
      watchHistory: user.userViewHistory,
      total_movies: user.total_movies
    });
  } catch (error) {
    console.error("Error adding movie to watch history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// Get user's watch history
app.get("/api/users/:userId/watch-history", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ 
      watchHistory: user.userViewHistory 
    });
  } catch (error) {
    console.error("Error retrieving watch history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.delete("/api/users/:userId/watch-history/:movieId", async (req, res) => {
  try {
    const { userId, movieId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updatedHistory = user.userViewHistory.filter((movie) => movie._id !== movieId);
    user.userViewHistory = updatedHistory;
    user.total_movies = updatedHistory.length;

    await user.save();

    res.status(200).json({
      message: "Movie removed from watch history",
      watchHistory: updatedHistory,
    });
  } catch (error) {
    console.error("Error deleting movie from history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
