"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import data from "./data.json";

type Sentence = {
  id: number;
  tamil: string;
  english: string;
};

type BookData = Record<string, Sentence[]>;

const bookData = data as BookData;
const bookKeys = Object.keys(bookData);

type Filter = "all" | "not_learned" | "learned";

export default function Home() {
  const [activeBook, setActiveBook] = useState(bookKeys[0]);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [learnedCards, setLearnedCards] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("learnedCards");
    if (saved) {
      try {
        setLearnedCards(new Set(JSON.parse(saved)));
      } catch {
        /* ignore corrupt data */
      }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "learnedCards",
        JSON.stringify([...learnedCards])
      );
    }
  }, [learnedCards, mounted]);

  const sentences = bookData[activeBook] || [];

  const filteredSentences = useMemo(() => {
    let result = sentences;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.tamil.toLowerCase().includes(q) ||
          s.english.toLowerCase().includes(q)
      );
    }

    if (filter === "learned") {
      result = result.filter((s) =>
        learnedCards.has(`${activeBook}-${s.id}`)
      );
    } else if (filter === "not_learned") {
      result = result.filter(
        (s) => !learnedCards.has(`${activeBook}-${s.id}`)
      );
    }

    return result;
  }, [sentences, searchQuery, filter, learnedCards, activeBook]);

  const learnedCount = useMemo(
    () =>
      sentences.filter((s) => learnedCards.has(`${activeBook}-${s.id}`)).length,
    [sentences, learnedCards, activeBook]
  );

  const toggleReveal = useCallback((key: string) => {
    setRevealedCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleLearned = useCallback((key: string) => {
    setLearnedCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleShowAll = () => {
    setShowAll(true);
    const keys = new Set(revealedCards);
    filteredSentences.forEach((s) => keys.add(`${activeBook}-${s.id}`));
    setRevealedCards(keys);
  };

  const handleHideAll = () => {
    setShowAll(false);
    const keys = new Set(revealedCards);
    filteredSentences.forEach((s) => keys.delete(`${activeBook}-${s.id}`));
    setRevealedCards(keys);
  };

  const handleClearLearned = () => {
    const next = new Set(learnedCards);
    sentences.forEach((s) => next.delete(`${activeBook}-${s.id}`));
    setLearnedCards(next);
  };

  const handleStop = () => {
    handleHideAll();
    setSearchQuery("");
    setFilter("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isRevealed = (s: Sentence) =>
    showAll || revealedCards.has(`${activeBook}-${s.id}`);

  const bookLabel = (key: string) => {
    const num = key.replace("book", "");
    return `Book ${num}`;
  };

  const bookLearnedCount = (key: string) =>
    bookData[key].filter((s) => learnedCards.has(`${key}-${s.id}`)).length;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#151823] border-b border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Logo and title */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                EP
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">
                  English Practice
                </h1>
                <p className="text-xs text-gray-400">
                  Read the Tamil, say the English, then reveal to check.
                </p>
              </div>
            </div>

            {/* Search and actions */}
            <div className="flex flex-1 items-center gap-2 sm:ml-auto">
              <div className="relative flex-1 max-w-sm">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search Tamil or English..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#1e2235] border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleShowAll}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                Show all
              </button>
              <button
                onClick={handleHideAll}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                Hide all
              </button>
              <button
                onClick={handleStop}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <span className="w-2 h-2 rounded-full bg-white inline-block" />
                Stop
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Book tabs and filters */}
      <div className="sticky top-[76px] z-40 bg-[#131620] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-2">
          {/* Book tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {bookKeys.map((key) => {
              const count = bookData[key].length;
              const learned = bookLearnedCount(key);
              const isActive = activeBook === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveBook(key);
                    setShowAll(false);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                      : "bg-[#1e2235] text-gray-400 hover:bg-[#262b42] hover:text-gray-200"
                  }`}
                >
                  {bookLabel(key)} · {count}
                  {learned > 0 && (
                    <span className="flex items-center gap-0.5 text-emerald-300">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {learned}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filter tabs and learned counter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(
                [
                  ["all", "All"],
                  ["not_learned", "Not learned"],
                  ["learned", "Learned"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === value
                      ? value === "all"
                        ? "bg-emerald-600 text-white"
                        : "bg-[#2a2f45] text-white"
                      : "bg-[#1a1e30] text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-amber-400 font-medium">
                Learned: {learnedCount}/{sentences.length} (
                {sentences.length
                  ? Math.round((learnedCount / sentences.length) * 100)
                  : 0}
                %)
              </span>
              {learnedCount > 0 && (
                <button
                  onClick={handleClearLearned}
                  className="text-red-400 hover:text-red-300 transition-colors underline"
                >
                  Clear learned
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sentence cards */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {filteredSentences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg">No sentences found</p>
            <p className="text-sm mt-1">
              Try changing the filter or search query
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredSentences.map((sentence) => {
              const cardKey = `${activeBook}-${sentence.id}`;
              const revealed = isRevealed(sentence);
              const learned = learnedCards.has(cardKey);

              return (
                <div
                  key={cardKey}
                  className={`card-enter relative rounded-xl border transition-all ${
                    learned
                      ? "bg-[#1a2332] border-emerald-800/50"
                      : "bg-[#1a1d2e] border-gray-800 hover:border-gray-700"
                  }`}
                >
                  {/* Card number */}
                  <div className="absolute top-2 left-3 text-xs font-bold text-gray-600">
                    {sentence.id}
                  </div>

                  <div className="px-4 pt-7 pb-3">
                    {/* Tamil sentence */}
                    <p className="tamil-text text-[15px] leading-relaxed text-yellow-100 font-medium mb-3">
                      {sentence.tamil}
                    </p>

                    {/* English sentence */}
                    <p
                      className={`text-sm leading-relaxed transition-all duration-200 ${
                        revealed
                          ? "text-gray-300"
                          : "hidden-text select-none"
                      }`}
                    >
                      {revealed
                        ? sentence.english
                        : sentence.english.replace(/[a-zA-Z]/g, "x")}
                    </p>
                  </div>

                  {/* Card actions */}
                  <div className="flex items-center justify-between px-3 pb-2">
                    <button
                      onClick={() => toggleLearned(cardKey)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        learned
                          ? "text-emerald-400 bg-emerald-900/30"
                          : "text-gray-600 hover:text-gray-400 hover:bg-gray-800"
                      }`}
                      title={
                        learned ? "Mark as not learned" : "Mark as learned"
                      }
                    >
                      <svg
                        className="w-5 h-5"
                        fill={learned ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={() => toggleReveal(cardKey)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        revealed
                          ? "text-blue-400 bg-blue-900/30"
                          : "text-gray-600 hover:text-gray-400 hover:bg-gray-800"
                      }`}
                      title={revealed ? "Hide English" : "Show English"}
                    >
                      {revealed ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
