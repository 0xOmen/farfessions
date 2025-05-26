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
      setFarfessions(data.farfessions);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
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
          <p className="mb-2">{farfession.text}</p>
          <div className="flex justify-between items-center text-sm text-gray-300">
            <span>
              {farfession.user_fid
                ? `FID: ${farfession.user_fid}`
                : "Anonymous"}
            </span>
            <span>{formatDate(farfession.created_at)}</span>
          </div>
          <div className="flex gap-4 mt-2">
            <button
              onClick={() => handleLike(farfession.id)}
              className="flex items-center gap-1 text-sm hover:text-white"
            >
              👍 {farfession.likes}
            </button>
            <button
              onClick={() => handleDislike(farfession.id)}
              className="flex items-center gap-1 text-sm hover:text-white"
            >
              👎 {farfession.dislikes}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
