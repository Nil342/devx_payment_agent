import { useState } from "react";
import {
  useListMemoryEvents, useSearchMemory,
  getListMemoryEventsQueryKey
} from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Brain, Zap } from "lucide-react";
import { AddMemoryDialog } from "./memory/add-memory-dialog";

const importanceColor = (imp: number | null | undefined) => {
  if (!imp) return "text-muted-foreground";
  if (imp >= 9) return "text-red-600 font-bold";
  if (imp >= 7) return "text-amber-600 font-semibold";
  if (imp >= 5) return "text-blue-600";
  return "text-muted-foreground";
};

export default function MemoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const { data: events = [], isLoading } = useListMemoryEvents({}, {
    query: { queryKey: getListMemoryEventsQueryKey({}) }
  });

  const searchMutation = useSearchMemory({
    mutation: {
      onSuccess: (results) => {
        setSearchResults(results);
        setIsSearching(false);
      },
      onError: () => setIsSearching(false),
    }
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    searchMutation.mutate({ data: { query: searchQuery, limit: 20 } });
  };

  const displayed = searchResults ?? events;

  return (
    <Shell
      title="Memory Explorer"
      subtitle="AI agent memory — vendor patterns and historical context"
    >
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-memory-search"
            placeholder="Semantic search memory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9 bg-white/80"
          />
        </div>
        <Button
          data-testid="button-search-memory"
          onClick={handleSearch}
          disabled={isSearching}
          className="gap-2"
        >
          <Zap className="w-4 h-4" />
          {isSearching ? "Searching..." : "Search"}
        </Button>
        {searchResults && (
          <Button variant="outline" onClick={() => { setSearchResults(null); setSearchQuery(""); }}>
            Clear
          </Button>
        )}
        <AddMemoryDialog />
      </div>

      {searchResults && (
        <div className="flex items-center gap-2 mb-4 px-1">
          <Brain className="w-4 h-4 text-primary" />
          <p className="text-sm text-muted-foreground">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"</p>
        </div>
      )}

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : displayed.map((event) => (
            <div
              key={event.id}
              data-testid={`card-memory-${event.id}`}
              className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Brain className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                      {event.eventType.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">{event.vendorName ?? `#${event.vendorId}`}</span>
                    {event.importance != null && (
                      <span className={`text-xs ${importanceColor(event.importance)}`}>
                        importance: {event.importance}/10
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{event.content}</p>
                  {event.tags && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {event.tags.split(",").map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground shrink-0">{formatDate(event.createdAt)}</p>
              </div>
            </div>
          ))
        }
        {!isLoading && displayed.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">No memory events found</div>
        )}
      </div>
    </Shell>
  );
}
