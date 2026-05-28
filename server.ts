import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Shared lazy initializer for Gemini API
  let aiClient: GoogleGenAI | null = null;
  function getAiClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        throw new Error("GEMINI_API_KEY is not configured. Please supply a valid key under Settings > Secrets.");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // API endpoint for simulating AI agents and querying the codebase
  app.post("/api/query-code", async (req, res) => {
    try {
      const { prompt, files, manifest, selectedTags } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }

      // 1. Simulation A: Naive Full Repository Search
      // We pass ALL files and ALL content.
      const naiveContext = files.map((f: any) => `--- File: ${f.name} ---\n${f.content}`).join("\n\n");
      const naivePrompt = `
You are acting as an AI Coding Agent refactoring a software system.
A developer has asked you to perform the following task:
"${prompt}"

Here is the entire codebase:
${naiveContext}

Provide:
1. A conceptual action plan explaining how you would complete the task.
2. The specific list of files you must search and modify.
3. Your estimated cognitive load / token analysis (conceptually).
Keep your response concise but complete.
`;

      // 2. Simulation B: Deterministic Anchor Planning
      // We filter down the codebase to ONLY files and specifically tagged sections matching selected tags,
      // or if no selectedTags are specified, we search the manifest to see which tags match the prompt's intent.
      let relevantTags = selectedTags || [];
      
      if (relevantTags.length === 0 && manifest && manifest.length > 0) {
        // Find tags based on keywords matches in prompt or tag descriptions
        const keywords = prompt.toLowerCase().split(/\s+/);
        relevantTags = manifest
          .filter((t: any) => {
            const matchName = t.name.toLowerCase();
            const matchId = t.id.toLowerCase();
            const matchPurpose = (t.purpose || "").toLowerCase();
            const matchType = (t.type || "").toLowerCase();
            return keywords.some((kw: string) => 
              kw.length > 2 && (matchName.includes(kw) || matchId.includes(kw) || matchPurpose.includes(kw) || matchType.includes(kw))
            );
          })
          .map((t: any) => t.id);
        
        // Default to a few of them if nothing matches
        if (relevantTags.length === 0) {
          relevantTags = manifest.slice(0, 2).map((t: any) => t.id);
        }
      }

      // Build anchor isolated context
      // For each relevant tag, extract context lines (the tagged line and surrounding 5 lines)
      const anchorSnippets: string[] = [];
      const tagDetails: any[] = [];

      relevantTags.forEach((tagId: string) => {
        const tag = manifest.find((t: any) => t.id === tagId);
        if (!tag) return;

        tagDetails.push(tag);
        const file = files.find((f: any) => f.name === tag.file);
        if (!file) {
          anchorSnippets.push(`[Tag ID: ${tagId}] Associated file "${tag.file}" not found in current workspace.`);
          return;
        }

        // Search for the tag anchor comment in the file content
        const lines = file.content.split("\n");
        let foundLineIdx = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`@anchor[${tagId}]`) || lines[i].includes(tagId)) {
            foundLineIdx = i;
            break;
          }
        }

        if (foundLineIdx !== -1) {
          const start = Math.max(0, foundLineIdx - 4);
          const end = Math.min(lines.length - 1, foundLineIdx + 4);
          const snippet = lines.slice(start, end + 1).map((l: string, idx: number) => {
            const lineNum = start + idx + 1;
            const isTarget = lineNum === (foundLineIdx + 1);
            return `${isTarget ? ">>> " : "    "}[L${lineNum}] ${l}`;
          }).join("\n");
          
          anchorSnippets.push(`--- File: ${file.name} | Anchor: @anchor[${tagId}] (${tag.name}) ---\nType: ${tag.type}\nPurpose: ${tag.purpose}\nCode Segment:\n${snippet}`);
        } else {
          // Fallback if tag is orphaned
          anchorSnippets.push(`--- File: ${file.name} | [ORPHANED TAG] @anchor[${tagId}] (${tag.name}) ---\nType: ${tag.type}\nPurpose: ${tag.purpose}\nWarning: Anchor comment is missing in file code!`);
        }
      });

      const anchorContext = anchorSnippets.join("\n\n");
      const anchorPrompt = `
You are acting as an AI Coding Agent refactoring a software system.
A developer has asked you to perform the following task:
"${prompt}"

Instead of scanning the whole repo, you did a deterministic lookup on our Central Code Anchor Manifest and retrieved ONLY the associated anchor tagged zones:
${anchorContext}

Provide:
1. A highly targeted conceptual action plan relying exclusively on these mapped anchors.
2. A list of exact files and marked code lines you would modify.
3. Contrast how having these deterministic anchors made your plan 100% reliable compared to searching through open folders.
Keep your response concise but extremely specific.
`;

      let naiveText = "";
      let anchorText = "";
      let errorOccurred = false;
      let errorMessage = "";

      try {
        const ai = getAiClient();
        
        // Run both queries in parallel
        const [naiveRes, anchorRes] = await Promise.all([
          ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: naivePrompt,
          }),
          ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: anchorPrompt,
          })
        ]);

        naiveText = naiveRes.text || "No response received.";
        anchorText = anchorRes.text || "No response received.";
      } catch (geminiError: any) {
        errorOccurred = true;
        errorMessage = geminiError.message || "Unknown error";
        
        // Simulating highly descriptive and helpful fallback results if no API key is set yet
        naiveText = `### [MOCK PLAN] Naive Search Approach for: "${prompt}"

1. **Approach**: Scanning all workspace files using a keyword search (e.g., regex / grep).
2. **Impacted Files**: Auth Router, payment-handler, API Gateway.
3. **Weakness**: Must read thousands of code lines to ensure no dependencies are missed. High hazard of hallucination or overlooking subtle linkages inside un-indexed routes.
4. **Estimated Token Cost**: ~${files.length * 400 + 150} tokens.`;

        anchorText = `### [MOCK PLAN] Deterministic Anchor-Targeted Plan for: "${prompt}"

1. **Targeted Anchors**: ${relevantTags.length > 0 ? relevantTags.join(", ") : "None Detected (Manifest Scan: 0 matches)"}
2. **Context Retrieved**: Instantly queried only ${relevantTags.length} code segments, skipping 95% of irrelevant boilerplate files.
3. **Action Path**:
${tagDetails.map(t => `   - Modifying \`${t.file}\` directly around anchor tag \`@anchor[${t.id}]\` (${t.name}, tag-type \`${t.type}\`).`).join("\n")}
4. **Reliability Comparison**: We bypass blind directory-level search entirely. The manifest guarantees we find exactly ${relevantTags.length} touchpoints, eliminating legacy code side-effects.
5. **Estimated Token Cost**: ~${relevantTags.length * 120 + 80} tokens (Savings: ~${Math.max(10, Math.round(((files.length * 400 - relevantTags.length * 120) / (files.length * 400)) * 100))}%).`;
      }

      res.json({
        success: !errorOccurred,
        errorMessage: errorMessage,
        relevantTags,
        naiveOutput: naiveText,
        anchorOutput: anchorText,
        naiveTokenCalc: files.length * 400 + 150,
        anchorTokenCalc: relevantTags.length * 120 + 80,
      });

    } catch (err: any) {
      console.error("API Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Serve static assets in production, otherwise use Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});
