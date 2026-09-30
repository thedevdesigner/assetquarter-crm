"use client";

interface SourceToggleProps {
  source: "gumtree" | "rightmove";
  onSourceChange: (source: "gumtree" | "rightmove") => void;
}

export function SourceToggle({ source, onSourceChange }: SourceToggleProps) {
  return (
    <div className="inline-flex p-1 bg-muted rounded-xl border">
      <button
        onClick={() => onSourceChange("gumtree")}
        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
          source === "gumtree"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Gumtree
      </button>
      <button
        onClick={() => onSourceChange("rightmove")}
        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
          source === "rightmove"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Rightmove
      </button>
    </div>
  );
}