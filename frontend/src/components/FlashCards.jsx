import  { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  User,
  LogOut,
  BarChart,
  Plus,
  X,
} from "lucide-react";
import AuthForm from "./Auth";

const FlashcardApp = ({api}) => {
  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState({
    today: 0,
    total: 0,
    boxCounts: [0, 0, 0, 0, 0],
  });
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ question: "", answer: "", box: 1 });

  const boxIntervals = [0, 1, 3, 7, 14, 30]; 



  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchFlashcards();
    }
  }, [isLoggedIn]);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const response = await axios.get(api+"/auth/me");
        setUser(response.data);
        setIsLoggedIn(true);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      localStorage.removeItem("token");
      setLoading(false);
    }
  };

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      const response = await axios.get(api+"/flashcards/due");
      setFlashcards(response.data.cards);
      setProgress({
        today: response.data.dueToday,
        total: response.data.total,
        boxCounts: response.data.boxCounts || [0, 0, 0, 0, 0],
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      setLoading(false);
    }
  };

  const handleLogin = async (email,password) => {
    try {
      const response = await axios.post(api+"/auth/login", {
        email,
        password
      });
      console.log("Login response:", response.data);
      localStorage.setItem("token", response.data.token);
      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${response.data.token}`;
      setUser(response.data.user);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Login error:", error);
      alert("Invalid credentials");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    setIsLoggedIn(false);
    setFlashcards([]);
  };

  const handleAnswer = async (correct) => {
    if (flashcards.length === 0) return;

    const currentCard = flashcards[currentCardIndex];

    let newBox;
    let nextReviewDate = new Date();

    if (correct) {
      newBox = Math.min(currentCard.box + 1, 5);
    } else {
      newBox = 1;
    }

    nextReviewDate.setDate(nextReviewDate.getDate() + boxIntervals[newBox]);

    try {
      await axios.put(`${api}/flashcards/${currentCard._id}`, {
        correct,
        box: newBox,
        nextReviewDate: nextReviewDate.toISOString(),
      });

      if (currentCardIndex < flashcards.length - 1) {
        setShowAnswer(false);
        setCurrentCardIndex((prevIndex) => prevIndex + 1);
      } else {
        setShowAnswer(false);
        setCurrentCardIndex(0);
        fetchFlashcards();
      }
    } catch (error) {
      console.error("Error updating flashcard:", error);
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();

    try {
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + boxIntervals[1]);

      await axios.post(api+"/flashcards", {
        ...newCard,
        nextReviewDate: nextReviewDate.toISOString(),
      });

      setNewCard({ question: "", answer: "", box: 1 });
      setShowAddCard(false);

      fetchFlashcards();
    } catch (error) {
      console.error("Error adding flashcard:", error);
      alert("Failed to add flashcard. Please try again.");
    }
  };

  const renderStats = () => {
    if (!showStats) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`fixed inset-0 bg-black  bg-opacity-50 flex items-center justify-center z-50`}
        onClick={() => setShowStats(false)}
      >
        <div
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              Your Flashcard Statistics
            </h3>
            <button
              onClick={() => setShowStats(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                Progress Today
              </h4>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {progress.today} flashcards due
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                Total Collection
              </h4>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {progress.total} flashcards
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                Leitner Boxes
              </h4>
              <div className="mt-2 flex justify-between">
                {progress.boxCounts.map((count, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {count}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Box {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                Review Schedule
              </h4>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-gray-600 dark:text-gray-400">
                      Box
                    </th>
                    <th className="text-left text-gray-600 dark:text-gray-400">
                      Review Interval
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {boxIntervals.slice(1).map((interval, index) => (
                    <tr key={index}>
                      <td className="py-1 text-gray-700 dark:text-gray-300">
                        Box {index + 1}
                      </td>
                      <td className="py-1 text-gray-700 dark:text-gray-300">
                        {interval} {interval === 1 ? "day" : "days"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderAddCardForm = () => {
    if (!showAddCard) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={() => setShowAddCard(false)}
      >
        <div
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              Add New Flashcard
            </h3>
            <button
              onClick={() => setShowAddCard(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleAddCard}>
            <div className="mb-4">
              <label
                className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
                htmlFor="question"
              >
                Question
              </label>
              <textarea
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="question"
                rows="3"
                placeholder="Enter your question here"
                required
                value={newCard.question}
                onChange={(e) =>
                  setNewCard({ ...newCard, question: e.target.value })
                }
              />
            </div>

            <div className="mb-4">
              <label
                className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
                htmlFor="answer"
              >
                Answer
              </label>
              <textarea
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="answer"
                rows="3"
                placeholder="Enter the answer here"
                required
                value={newCard.answer}
                onChange={(e) =>
                  setNewCard({ ...newCard, answer: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddCard(false)}
                className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition duration-200"
              >
                Add Card
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">

    <AuthForm handleLogin={handleLogin} api={api} />
    
    </div>);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                Qubrain
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddCard(true)}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                title="Add New Flashcard"
              >
                <Plus size={20} />
              </button>
              <button
                onClick={() => setShowStats(true)}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                title="View Statistics"
              >
                <BarChart size={20} />
              </button>
              <button
                onClick={() => {
                  const html = document.documentElement;
                  html.classList.toggle("dark");
                  setDarkMode(html.classList.contains("dark"));
                }}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                title="Toggle Dark Mode"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <div className="relative">
                <button className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                  <User size={20} />
                  <span className="text-sm font-medium">
                    {user?.name || "User"}
                  </span>
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                title="Log Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-grow max-w-7xl min-w-xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-2">
            <h2 className="text-lg font-medium text-gray-800 dark:text-white">
              Today's Progress
            </h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {flashcards.length} cards due now | {progress.today} cards due today
            </span>
          </div>

          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${
                  progress.today > 0
                    ? ((progress.today - flashcards.length) / progress.today) *
                      100
                    : 0
                }%`,
              }}
            ></div>
          </div>
          <div className="mt-3 flex justify-between text-xs text-gray-600 dark:text-gray-400">
            {progress.boxCounts.map((count, index) => (
              <div key={index} className="text-center">
                <span className="font-medium">Box {index + 1}</span>
                <span className="ml-1">({count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-16">
        {flashcards.length > 0 ? (
          <div className="flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCardIndex}
                initial={{ opacity: 0, rotateY: -10, scale: 0.95 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, rotateY: 10, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-2xl perspective"
              >
                <div
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden transition-all duration-500 transform`}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="p-6 md:p-8 flex flex-col items-center">
                    <div className="w-full mb-8 text-sm text-gray-500 dark:text-gray-400 flex justify-between">
                      <span>
                        Card {currentCardIndex + 1} of {flashcards.length}
                      </span>
                      <span>Box: {flashcards[currentCardIndex].box}</span>
                    </div>

                    <div className="w-full flex-grow flex flex-col items-center justify-center text-center space-y-6 py-8">
                      <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {flashcards[currentCardIndex].question}
                      </h3>

                      <AnimatePresence>
                        {showAnswer && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg w-full"
                          >
                            <p className="text-xl text-gray-800 dark:text-white">
                              {flashcards[currentCardIndex].answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="w-full mt-8 flex flex-col space-y-3">
                      {!showAnswer ? (
                        <button
                          onClick={() => setShowAnswer(true)}
                          className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition duration-300"
                        >
                          Show Answer
                        </button>
                      ) : (
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleAnswer(false)}
                            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition duration-300"
                          >
                            Forgot
                          </button>
                          <button
                            onClick={() => handleAnswer(true)}
                            className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition duration-300"
                          >
                            Remembered
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-2">
              Great job! You've completed all your flashcards for now.
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Check back later for more cards due for review, or add new cards
              to study.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={fetchFlashcards}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition duration-300"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowAddCard(true)}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg flex items-center space-x-1 transition duration-300"
              >
                <Plus size={16} />
                <span>Add New Card</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {renderStats()}
      {renderAddCardForm()}
      <footer className="bg-white dark:bg-gray-800 text-center py-4 mt-8 shadow-inner">
        <p className="text-gray-600 dark:text-gray-300">
          Created by <a href="https://github.com/harivardhan888" className="text-blue-500 dark:text-blue-400 hover:underline">Hari Vardhan Reddy Kummetha</a>
        </p>
      </footer>
    </div>
  );
};

export default FlashcardApp;
