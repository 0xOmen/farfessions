"use client";

import { useEffect, useState } from "react";
import { Farfession } from "~/lib/supabase";
import { Button } from "./ui/Button";

export default function FarfessionFeed() {
  const [farfessions, setFarfessions] = useState<Farfession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFarfessions();
  }, []);

  const fetchFarfessions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/farfessions");

      if (!response.ok) {
        throw new Error("Failed to fetch farfessions");
      }

      const data = await response.json();

      // Filter to only show submissions from the last 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const recentFarfessions = data.farfessions.filter(
        (farfession: Farfession) => {
          const submissionDate = new Date(farfession.created_at);
          return submissionDate >= twentyFourHoursAgo;
        }
      );

      // Sort by likes in descending order (most likes first)
      const sortedFarfessions = recentFarfessions.sort(
        (a: Farfession, b: Farfession) => b.likes - a.likes
      );
      setFarfessions(sortedFarfessions);
    } catch (err) {
      console.error("Error fetching farfessions:", err);
      setError("Failed to load farfessions. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id: number) => {
    try {
      const response = await fetch(`/api/farfessions/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "like" }),
      });

      if (!response.ok) {
        throw new Error("Failed to like farfession");
      }

      // Update the farfession in our local state
      setFarfessions((prevFarfessions) =>
        prevFarfessions.map((f) =>
          f.id === id ? { ...f, likes: f.likes + 1 } : f
        )
      );
    } catch (err) {
      console.error("Error liking farfession:", err);
      alert("Failed to like the farfession. Please try again.");
    }
  };

  const handleDislike = async (id: number) => {
    try {
      const response = await fetch(`/api/farfessions/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "dislike" }),
      });

      if (!response.ok) {
        throw new Error("Failed to dislike farfession");
      }

      // Update the farfession in our local state
      setFarfessions((prevFarfessions) =>
        prevFarfessions.map((f) =>
          f.id === id ? { ...f, dislikes: f.dislikes + 1 } : f
        )
      );
    } catch (err) {
      console.error("Error disliking farfession:", err);
      alert("Failed to dislike the farfession. Please try again.");
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading farfessions...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-300">
        {error}
        <button
          onClick={fetchFarfessions}
          className="ml-2 underline hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (farfessions.length === 0) {
    return (
      <div className="text-center py-4">
        No farfessions yet. Be the first to submit one!
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <h2 className="text-xl font-bold">Recent Farfessions</h2>
      {farfessions.map((farfession) => (
        <div key={farfession.id} className="p-4 bg-[#7252B8] rounded-lg shadow">
          <p className="mb-3">{farfession.text}</p>
          <div className="flex gap-4">
            <button
              onClick={() => handleLike(farfession.id)}
              className="flex items-center gap-1 text-sm hover:text-white bg-[#7252B8] px-2 py-1 rounded"
            >
              👍 {farfession.likes}
            </button>
            <button
              onClick={() => handleDislike(farfession.id)}
              className="flex items-center gap-1 text-sm hover:text-white bg-[#7252B8] px-2 py-1 rounded"
            >
              👎 {farfession.dislikes}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
