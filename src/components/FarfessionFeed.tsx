"use client";

import { useEffect, useState } from "react";
import { FarfessionWithUserVote } from "~/lib/supabase";
import { Button } from "./ui/Button";
import { useFrame } from "~/components/providers/FrameProvider";

export default function FarfessionFeed() {
  const [farfessions, setFarfessions] = useState<FarfessionWithUserVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { context } = useFrame();

  useEffect(() => {
    fetchFarfessions();
  }, [context?.user?.fid]);

  const fetchFarfessions = async () => {
    try {
      setLoading(true);
      const userFid = context?.user?.fid;
      const url = userFid
        ? `/api/farfessions?userFid=${userFid}`
        : "/api/farfessions";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch farfessions");
      }

      const data = await response.json();

      // Filter to only show submissions from the last 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const recentFarfessions = data.farfessions.filter(
        (farfession: FarfessionWithUserVote) => {
          const submissionDate = new Date(farfession.created_at);
          return submissionDate >= twentyFourHoursAgo;
        }
      );

      // Sort by likes in descending order (most likes first)
      const sortedFarfessions = recentFarfessions.sort(
        (a: FarfessionWithUserVote, b: FarfessionWithUserVote) =>
          b.likes - a.likes
      );
      setFarfessions(sortedFarfessions);
    } catch (err) {
      console.error("Error fetching farfessions:", err);
      setError("Failed to load farfessions. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (id: number, action: "like" | "dislike") => {
    const userFid = context?.user?.fid;

    if (!userFid) {
      alert("You need to be signed in to vote on farfessions.");
      return;
    }

    try {
      const response = await fetch(`/api/farfessions/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, userFid }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Duplicate vote error
          alert(result.error);
          return;
        }
        throw new Error(result.error || "Failed to vote");
      }

      // Refresh the farfessions to get updated counts and vote status
      await fetchFarfessions();
    } catch (err) {
      console.error(`Error ${action}ing farfession:`, err);
      alert(`Failed to ${action} the farfession. Please try again.`);
    }
  };

  const handleLike = (id: number) => handleVote(id, "like");
  const handleDislike = (id: number) => handleVote(id, "dislike");

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
              className={`flex items-center gap-1 text-sm hover:text-white px-2 py-1 rounded ${
                farfession.user_vote === "like"
                  ? "bg-green-600 text-white"
                  : "bg-[#7252B8]"
              }`}
              disabled={farfession.user_vote === "like"}
            >
              👍 {farfession.likes}
            </button>
            <button
              onClick={() => handleDislike(farfession.id)}
              className={`flex items-center gap-1 text-sm hover:text-white px-2 py-1 rounded ${
                farfession.user_vote === "dislike"
                  ? "bg-red-600 text-white"
                  : "bg-[#7252B8]"
              }`}
              disabled={farfession.user_vote === "dislike"}
            >
              👎 {farfession.dislikes}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
