"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface SimulationResult {
  id: string;
  persona_name: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral";
  relevance_score: number | null;
  toxicity_score: number | null;
  created_at: string;
}

interface DiscussionThreadProps {
  results: SimulationResult[];
}

function getPersonaInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  // Generate consistent color based on name
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getSentimentBadge(sentiment: SimulationResult["sentiment"]) {
  const config = {
    positive: { emoji: "😊", label: "Positive", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    neutral: { emoji: "😐", label: "Neutral", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
    negative: { emoji: "😞", label: "Negative", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  };

  const { emoji, label, className } = config[sentiment];

  return (
    <Badge variant="outline" className={className}>
      {emoji} {label}
    </Badge>
  );
}

export function DiscussionThread({ results }: DiscussionThreadProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {results.map((result, index) => (
        <div
          key={result.id}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
        >
          <div className="flex gap-3 p-4 rounded-lg border bg-card hover:shadow-sm transition-all">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar className={`h-10 w-10 ${getAvatarColor(result.persona_name)} text-white`}>
                <AvatarFallback className="bg-transparent text-white font-semibold text-sm">
                  {getPersonaInitials(result.persona_name)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm">
                  {result.persona_name}
                </h4>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground">
                  {new Date(result.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {getSentimentBadge(result.sentiment)}
              </div>

              {/* Comment Text */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">
                {result.content}
              </p>

              {/* Metrics */}
              {(result.relevance_score !== null || result.toxicity_score !== null) && (
                <div className="flex gap-4 text-xs">
                  {result.relevance_score !== null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Relevance:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${result.relevance_score * 100}%` }}
                          />
                        </div>
                        <span className="font-medium text-xs">
                          {Math.round(result.relevance_score * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                  {result.toxicity_score !== null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Toxicity:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              result.toxicity_score > 0.5
                                ? "bg-red-500"
                                : result.toxicity_score > 0.3
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${result.toxicity_score * 100}%` }}
                          />
                        </div>
                        <span className="font-medium text-xs">
                          {Math.round(result.toxicity_score * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
