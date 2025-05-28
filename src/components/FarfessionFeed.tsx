"use client";

import { useEffect, useState } from "react";
import { FarfessionWithUserVote } from "~/lib/supabase";
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

      // Define time periods
      const now = new Date();
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Separate farfessions by time period
      const last24Hours: FarfessionWithUserVote[] = [];
      const lastWeek: FarfessionWithUserVote[] = [];

      data.farfessions.forEach((farfession: FarfessionWithUserVote) => {
        const submissionDate = new Date(farfession.created_at);

        if (submissionDate >= twentyFourHoursAgo) {
          // Last 24 hours
          last24Hours.push(farfession);
        } else if (submissionDate >= oneWeekAgo) {
          // Last week (excluding last 24 hours)
          lastWeek.push(farfession);
        }
        // Ignore anything older than a week
      });

      // Sort both groups by likes (descending)
      const sortedLast24Hours = last24Hours.sort((a, b) => b.likes - a.likes);

      const sortedLastWeek = lastWeek.sort((a, b) => b.likes - a.likes);

      // Combine: 24 hours first, then week
      const combinedFarfessions = [...sortedLast24Hours, ...sortedLastWeek];

      setFarfessions(combinedFarfessions);
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

    const ADMIN_FID = 212074;
    const isAdmin = userFid === ADMIN_FID;

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
        if (response.status === 409 && !isAdmin) {
          // Duplicate vote error for non-admin users
          alert(result.error);
          return;
        }
        throw new Error(result.error || "Failed to vote");
      }

      // Show success message for admin multiple votes
      if (result.data?.isAdmin) {
        console.log(`Admin vote recorded: ${action}`);
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Recent Farfessions</h2>

        <button
          onClick={fetchFarfessions}
          disabled={loading}
          className="p-1 hover:bg-[#7252B8] rounded transition-colors disabled:opacity-50"
          title="Refresh feed"
        >
          <svg
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
      <div className="text-sm text-white-400 font-semibold">
        "Like" the best confessions!
      </div>

      {farfessions.map((farfession, index) => {
        const userFid = context?.user?.fid;
        const ADMIN_FID = 212074;
        const isAdmin = userFid === ADMIN_FID;

        // Check if this is the first item from the "last week" section
        const submissionDate = new Date(farfession.created_at);
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const isFromLastWeek = submissionDate < twentyFourHoursAgo;
        const prevFarfession = index > 0 ? farfessions[index - 1] : null;
        const prevSubmissionDate = prevFarfession
          ? new Date(prevFarfession.created_at)
          : null;
        const prevIsFromLast24Hours = prevSubmissionDate
          ? prevSubmissionDate >= twentyFourHoursAgo
          : false;

        // Show section divider when transitioning from 24h to week
        const showWeekDivider = isFromLastWeek && prevIsFromLast24Hours;

        return (
          <div key={farfession.id}>
            {showWeekDivider && (
              <div className="text-center py-2">
                <div className="text-sm text-gray-400 font-semibold">
                  — From This Week —
                </div>
              </div>
            )}
            <div className="p-4 bg-[#7252B8] rounded-lg shadow border border-white">
              <p className="mb-3">{farfession.text}</p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleLike(farfession.id)}
                  className={`flex items-center gap-1 text-sm hover:text-white px-2 py-1 rounded ${
                    farfession.user_vote === "like" && !isAdmin
                      ? "bg-green-600 text-white"
                      : "bg-[#7252B8]"
                  }`}
                  disabled={farfession.user_vote === "like" && !isAdmin}
                >
                  👍 {farfession.likes}
                  {isAdmin && <span className="text-xs ml-1">(Admin)</span>}
                </button>
                <button
                  onClick={() => handleDislike(farfession.id)}
                  className={`flex items-center gap-1 text-sm hover:text-white px-2 py-1 rounded ${
                    farfession.user_vote === "dislike" && !isAdmin
                      ? "bg-red-600 text-white"
                      : "bg-[#7252B8]"
                  }`}
                  disabled={farfession.user_vote === "dislike" && !isAdmin}
                >
                  👎 {farfession.dislikes}
                  {isAdmin && <span className="text-xs ml-1">(Admin)</span>}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
