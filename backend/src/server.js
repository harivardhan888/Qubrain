import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

// dotenv.config({ path: "./backend/.env" }); // adjust path if needed

const app = express();
app.use(express.json());

const __dirname = path.resolve();

// CORS configuration for both development and production
const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:5000", 
  "https://qubrain.vercel.app",
  "https://qubrain-app.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    optionsSuccessStatus: 200 // For legacy browser support
  })
);

if (process.env.NODE_ENV !== "production") {
  console.log("Running in development mode");
} else {
  console.log("Running in production mode");
}

dotenv.config();

// JWT Secret
const JWT_SECRET = process.env.JWT_KEY;

// Connect to MongoDB
const dburl = process.env.MONGODB_URI  // ✅ keep this consistent

console.log("Loaded MONGO_URL:", dburl);

export const connectDB = async (url) => {
  try {
    const conn = await mongoose.connect(url);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log("Error in connecting to MongoDB", error);
    process.exit(1); // 1 means failure
  }
};
connectDB(dburl);


// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created: { type: Date, default: Date.now }
});

// Flashcard Schema
const flashcardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  box: { type: Number, default: 1 },
  nextReviewDate: { type: Date, default: Date.now },
  created: { type: Date, default: Date.now },
  lastReviewed: { type: Date, default: null }
});

const User = mongoose.model('User', userSchema);
const Flashcard = mongoose.model('Flashcard', flashcardSchema);

// Middleware to authenticate requests
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ===== AUTH ROUTES =====

// Register new user
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Create token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1H' });
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Login user
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Create token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login error', error: error.message });
  }
});

// Get current user
app.get('/auth/me', authenticate, (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email
  });
});

// Logout user (optional - mainly for logging purposes)
app.post('/auth/logout', authenticate, (req, res) => {
  // For JWT tokens, logout is typically handled on the client side
  // This endpoint can be used for logging logout events or invalidating tokens
  res.json({ message: 'Logged out successfully' });
});

// ===== FLASHCARDS ROUTES =====

// Add a new flashcard
app.post('/flashcards', authenticate, async (req, res) => {
  try {
    const { question, answer, box = 1 } = req.body;
    
    // Calculate next review date based on box
    const nextReviewDate = new Date();
    const intervals = [1, 3, 7, 14, 30]; // Days to wait for each box
    if (box > 0 && box <= 5) {
      nextReviewDate.setDate(nextReviewDate.getDate() + intervals[box - 1]);
    }
    
    const flashcard = new Flashcard({
      userId: req.user._id,
      question,
      answer,
      box,
      nextReviewDate
    });
    
    await flashcard.save();
    res.status(201).json(flashcard);
  } catch (error) {
    res.status(500).json({ message: 'Error creating flashcard', error: error.message });
  }
});

// Get all user's flashcards
app.get('/flashcards', authenticate, async (req, res) => {
  try {
    const flashcards = await Flashcard.find({ userId: req.user._id });
    res.json(flashcards);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching flashcards', error: error.message });
  }
});

// Get flashcards due for review
app.get('/flashcards/due', authenticate, async (req, res) => {
  try {
    const now = new Date();
    
    // Find cards due for review (nextReviewDate <= now)
    const dueCards = await Flashcard.find({
      userId: req.user._id,
      nextReviewDate: { $lte: now }
    }).sort({ box: 1, nextReviewDate: 1 }); // Sort by box (prioritize lower boxes) and then by date
    
    // Count total cards by box
    const allCards = await Flashcard.find({ userId: req.user._id });
    const total = allCards.length;
    
    // Count cards due today (for progress tracking)
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const dueTodayCount = await Flashcard.countDocuments({
      userId: req.user._id,
      nextReviewDate: { $lte: endOfDay }
    });
    
    // Count cards in each box
    const boxCounts = [0, 0, 0, 0, 0]; // For boxes 1-5
    allCards.forEach(card => {
      if (card.box >= 1 && card.box <= 5) {
        boxCounts[card.box - 1]++;
      }
    });
    
    res.json({
      cards: dueCards,
      dueToday: dueTodayCount,
      total,
      boxCounts
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching due flashcards', error: error.message });
  }
});

// Update flashcard (implement Leitner System logic)
app.put('/flashcards/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { correct, box, nextReviewDate } = req.body;
    
    const flashcard = await Flashcard.findOne({ _id: id, userId: req.user._id });
    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }
    
    // If box and nextReviewDate are directly provided, use those values
    if (box !== undefined && nextReviewDate) {
      flashcard.box = box;
      flashcard.nextReviewDate = new Date(nextReviewDate);
    } 
    // Otherwise calculate based on correct/incorrect answer
    else if (correct !== undefined) {
      // Leitner System logic
      if (correct) {
        flashcard.box = Math.min(flashcard.box + 1, 5);
      } else {
        flashcard.box = 1;
      }
      
      // Calculate next review date based on box
      const intervals = [1, 3, 7, 14, 30]; // Days to wait for each box
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + intervals[flashcard.box - 1]);
      flashcard.nextReviewDate = nextDate;
    }
    
    flashcard.lastReviewed = new Date();
    await flashcard.save();
    
    res.json(flashcard);
  } catch (error) {
    res.status(500).json({ message: 'Error updating flashcard', error: error.message });
  }
});

// Delete a flashcard
app.delete('/flashcards/:id', authenticate, async (req, res) => {
  try {
    const result = await Flashcard.findOneAndDelete({ 
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!result) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }
    
    res.json({ message: 'Flashcard deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting flashcard', error: error.message });
  }
});

// Get user statistics
app.get('/stats', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const userId = req.user._id;
    
    // Count total cards
    const totalCards = await Flashcard.countDocuments({ userId });
    
    // Count cards by box
    const boxCounts = await Promise.all([1, 2, 3, 4, 5].map(box => 
      Flashcard.countDocuments({ userId, box })
    ));
    
    // Cards due today
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const dueToday = await Flashcard.countDocuments({
      userId,
      nextReviewDate: { $lte: endOfDay }
    });
    
    // Cards reviewed today
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const reviewedToday = await Flashcard.countDocuments({
      userId,
      lastReviewed: { $gte: startOfDay, $lte: endOfDay }
    });
    
    res.json({
      totalCards,
      boxCounts,
      dueToday,
      reviewedToday
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));