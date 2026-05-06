import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';
import { initDB, signUp, signIn, saveScore, getScores } from './db';
import closedChest from './assets/treasure_closed.png';
import keyIcon from './assets/key.png';
import treasureChest from './assets/treasure_opened.png';
import skeletonChest from './assets/treasure_opened_skeleton.png';
import chestOpenSound from './audios/chest_open.mp3';
import evilLaughSound from './audios/chest_open_with_evil_laugh.mp3';

interface Box {
  id: number;
  isOpen: boolean;
  hasTreasure: boolean;
}

interface User {
  id: number;
  username: string;
}

interface ScoreRecord {
  score: number;
  created_at: string;
}

type View = 'auth' | 'game';

export default function App() {
  const [view, setView] = useState<View>('auth');
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<ScoreRecord[]>([]);
  const scoreSavedRef = useRef(false);

  const [boxes, setBoxes] = useState<Box[]>([]);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);

  useEffect(() => {
    initDB().then(() => setDbReady(true)).catch((e) => setDbError(String(e)));
  }, []);

  const initializeGame = () => {
    const treasureBoxIndex = Math.floor(Math.random() * 3);
    setBoxes(
      Array.from({ length: 3 }, (_, index) => ({
        id: index,
        isOpen: false,
        hasTreasure: index === treasureBoxIndex,
      }))
    );
    setScore(0);
    setGameEnded(false);
    scoreSavedRef.current = false;
  };

  useEffect(() => {
    if (view === 'game') initializeGame();
  }, [view]);

  useEffect(() => {
    if (!gameEnded || scoreSavedRef.current) return;
    scoreSavedRef.current = true;
    if (currentUser) {
      saveScore(currentUser.id, score).then(() =>
        getScores(currentUser.id).then(setScoreHistory)
      );
    }
  }, [gameEnded]);

  const openBox = (boxId: number) => {
    if (gameEnded) return;
    setBoxes((prevBoxes) => {
      const updatedBoxes = prevBoxes.map((box) => {
        if (box.id === boxId && !box.isOpen) {
          new Audio(box.hasTreasure ? chestOpenSound : evilLaughSound).play();
          setScore((prev) => prev + (box.hasTreasure ? 100 : -50));
          return { ...box, isOpen: true };
        }
        return box;
      });
      const treasureFound = updatedBoxes.some((box) => box.isOpen && box.hasTreasure);
      const allOpened = updatedBoxes.every((box) => box.isOpen);
      if (treasureFound || allOpened) setGameEnded(true);
      return updatedBoxes;
    });
  };

  const handleAuth = async (mode: 'signup' | 'signin') => {
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError('Please enter a username and password.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const user = mode === 'signup'
        ? await signUp(authUsername.trim(), authPassword)
        : await signIn(authUsername.trim(), authPassword);
      setCurrentUser(user);
      setIsGuest(false);
      const history = await getScores(user.id);
      setScoreHistory(history);
      setView('game');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuest = () => {
    setCurrentUser(null);
    setIsGuest(true);
    setView('game');
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setIsGuest(false);
    setAuthUsername('');
    setAuthPassword('');
    setAuthError('');
    setScoreHistory([]);
    setView('auth');
  };

  if (dbError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex items-center justify-center p-8">
        <p className="text-red-700 text-sm font-mono break-all">{dbError}</p>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex items-center justify-center">
        <p className="text-amber-800 text-lg">Loading...</p>
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl mb-2 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
        <p className="text-amber-700 mb-8">Sign in to track your scores!</p>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-300 p-8 w-full max-w-sm flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            value={authUsername}
            onChange={(e) => setAuthUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth('signin')}
            className="border border-amber-300 rounded-lg px-4 py-2 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth('signin')}
            className="border border-amber-300 rounded-lg px-4 py-2 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />

          {authError && (
            <p className="text-red-600 text-sm text-center">{authError}</p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => handleAuth('signin')}
              disabled={authLoading}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              Sign In
            </Button>
            <Button
              onClick={() => handleAuth('signup')}
              disabled={authLoading}
              className="flex-1 bg-amber-800 hover:bg-amber-900 text-white"
            >
              Sign Up
            </Button>
          </div>

          <button
            onClick={handleGuest}
            className="text-amber-600 hover:text-amber-800 text-sm underline text-center"
          >
            Play as Guest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <div className="text-amber-800 font-medium">
          {currentUser ? `👤 ${currentUser.username}` : '🎭 Guest'}
        </div>
        <button
          onClick={handleSignOut}
          className="text-amber-600 hover:text-amber-800 text-sm underline"
        >
          {currentUser ? 'Sign Out' : 'Back to Login'}
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl mb-4 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
        <p className="text-amber-800 mb-4">Click on the treasure chests to discover what's inside!</p>
        <p className="text-amber-700 text-sm">💰 Treasure: +$100 | 💀 Skeleton: -$50</p>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <div className="text-2xl text-center p-4 bg-amber-200/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-amber-400">
          <span className="text-amber-900">Current Score: </span>
          <span className={score >= 0 ? 'text-green-600' : 'text-red-600'}>${score}</span>
        </div>
        {gameEnded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={`text-2xl font-bold px-6 py-4 rounded-lg shadow-lg border-2 ${
              score > 0
                ? 'bg-green-100 text-green-700 border-green-400'
                : score === 0
                ? 'bg-yellow-100 text-yellow-700 border-yellow-400'
                : 'bg-red-100 text-red-700 border-red-400'
            }`}
          >
            <span className="font-normal">Result: </span>
            {score > 0 ? 'Win' : score === 0 ? 'Tie' : 'Loss'}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {boxes.map((box) => (
          <motion.div
            key={box.id}
            className="flex flex-col items-center"
            style={{ cursor: box.isOpen ? 'default' : `url(${keyIcon}), pointer` }}
            whileHover={{ scale: box.isOpen ? 1 : 1.05 }}
            whileTap={{ scale: box.isOpen ? 1 : 0.95 }}
            onClick={() => openBox(box.id)}
          >
            <motion.div
              initial={{ rotateY: 0 }}
              animate={{ rotateY: box.isOpen ? 180 : 0, scale: box.isOpen ? 1.1 : 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="relative"
            >
              <img
                src={box.isOpen ? (box.hasTreasure ? treasureChest : skeletonChest) : closedChest}
                alt={box.isOpen ? (box.hasTreasure ? 'Treasure!' : 'Skeleton!') : 'Treasure Chest'}
                className="w-48 h-48 object-contain drop-shadow-lg"
              />
              {box.isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                >
                  {box.hasTreasure ? (
                    <div className="text-2xl animate-bounce">✨💰✨</div>
                  ) : (
                    <div className="text-2xl animate-pulse">💀👻💀</div>
                  )}
                </motion.div>
              )}
            </motion.div>
            <div className="mt-4 text-center">
              {box.isOpen ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className={`text-lg p-2 rounded-lg ${
                    box.hasTreasure
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {box.hasTreasure ? '+$100' : '-$50'}
                </motion.div>
              ) : (
                <div className="text-amber-700 p-2">Click to open!</div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {gameEnded && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mb-4 p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400">
            <h2 className="text-2xl mb-2 text-amber-900">Game Over!</h2>
            <p className="text-lg text-amber-800">
              Final Score:{' '}
              <span className={score >= 0 ? 'text-green-600' : 'text-red-600'}>${score}</span>
            </p>
            <p className="text-sm text-amber-600 mt-2">
              {boxes.some((box) => box.isOpen && box.hasTreasure)
                ? 'Treasure found! Well done, treasure hunter! 🎉'
                : 'No treasure found this time! Better luck next time! 💀'}
            </p>
            {isGuest && (
              <p className="text-xs text-amber-500 mt-2">
                Sign in to save your scores!
              </p>
            )}
          </div>

          <Button
            onClick={initializeGame}
            className="text-lg px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white mb-6"
          >
            Play Again
          </Button>

          {currentUser && scoreHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 bg-white/80 backdrop-blur-sm rounded-xl shadow border-2 border-amber-300 p-4 w-full max-w-sm mx-auto"
            >
              <h3 className="text-amber-900 font-semibold mb-3">Your Last 10 Games</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-amber-700 border-b border-amber-200">
                    <th className="text-left pb-1">#</th>
                    <th className="text-right pb-1">Score</th>
                    <th className="text-right pb-1">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreHistory.map((record, i) => (
                    <tr key={i} className="border-b border-amber-100 last:border-0">
                      <td className="py-1 text-amber-600">{i + 1}</td>
                      <td className={`py-1 text-right font-medium ${record.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${record.score}
                      </td>
                      <td className="py-1 text-right text-amber-500">
                        {new Date(record.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
