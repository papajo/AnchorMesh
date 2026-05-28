import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const MODEL_PROVIDER = (process.env.MODEL_PROVIDER || "gemini").toLowerCase();

  // Lazy clients per provider
  let geminiClient: GoogleGenAI | null = null;
  let anthropicClient: Anthropic | null = null;
  let openaiClient: OpenAI | null = null;

  // Unified generate function — returns plain text regardless of provider
  async function generateText(prompt: string): Promise<string> {
    if (MODEL_PROVIDER === "anthropic") {
      if (!anthropicClient) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey || apiKey === "MY_ANTHROPIC_API_KEY")
          throw new Error("ANTHROPIC_API_KEY is not configured. Please supply a valid key under Settings > Secrets.");
        anthropicClient = new Anthropic({ apiKey });
      }
      const msg = await anthropicClient.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      return (msg.content[0] as { text: string }).text;

    } else if (MODEL_PROVIDER === "openai") {
      if (!openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey || apiKey === "MY_OPENAI_API_KEY")
          throw new Error("OPENAI_API_KEY is not configured. Please supply a valid key under Settings > Secrets.");
        openaiClient = new OpenAI({ apiKey });
      }
      const chat = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });
      return chat.choices[0].message.content ?? "";

    } else {
      // Default: Gemini
      if (!geminiClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "MY_GEMINI_API_KEY")
          throw new Error("GEMINI_API_KEY is not configured. Please supply a valid key under Settings > Secrets.");
        geminiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      }
      const res = await geminiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return res.text ?? "";
    }
  }

  // API endpoint for simulating AI agents and querying the codebase
  app.post("/api/query-code", async (req, res) => {
    try {
      const { prompt, files, manifest, selectedTags } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }

      // 1. Simulation A: Naive Full Repository Search
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
      let relevantTags = selectedTags || [];

      if (relevantTags.length === 0 && manifest && manifest.length > 0) {
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

        if (relevantTags.length === 0) {
          relevantTags = manifest.slice(0, 2).map((t: any) => t.id);
        }
      }

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
        [naiveText, anchorText] = await Promise.all([
          generateText(naivePrompt),
          generateText(anchorPrompt),
        ]);
      } catch (aiError: any) {
        errorOccurred = true;
        errorMessage = aiError.message || "Unknown error";

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

  // API endpoint for compiled anchor tag manifest JSON generation
  app.post("/api/anchor-tag-manifest.json", (req, res) => {
    try {
      const { manifest, triggers, variables } = req.body;
      const formattedOutput = {
        $schema: "https://anchormesh.io/schemas/v1/anchor-tag-manifest.json",
        version: "1.2.0",
        generatedAt: new Date().toISOString(),
        governance: {
          enforceStrictCompliance: variables?.find((v: any) => v.id === "VAR-02")?.value === "true",
          permittedPrefixes: variables?.find((v: any) => v.id === "VAR-03")?.value?.split(",").map((p: string) => p.trim()) || []
        },
        anchors: manifest || [],
        triggers: triggers || [],
        variables: variables || []
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=anchor-tag-manifest.json");
      return res.status(200).send(JSON.stringify(formattedOutput, null, 2));
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to generate manifest download." });
    }
  });

  // API endpoint for automatic AI codebase scanning & anchor annotation insertion
  app.post("/api/auto-generate-anchors", async (req, res) => {
    try {
      const { files } = req.body;
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: "Missing or invalid files array for scanning" });
      }

      let generatedOutput: { files: any[]; anchors: any[] } | null = null;
      let usedAI = false;

      // Check if any API key is configured
      const hasKey =
        (MODEL_PROVIDER === "gemini" && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") ||
        (MODEL_PROVIDER === "anthropic" && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "MY_ANTHROPIC_API_KEY") ||
        (MODEL_PROVIDER === "openai" && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "MY_OPENAI_API_KEY");

      if (hasKey) {
        try {
          const scanPrompt = `
You are a deterministic software agent registry scanner for "AnchorMesh".
Your task is to analyze the provided codebase files and automatically place high-value anchor comment annotations inside the file contents, then output both the updated files and a list of registered anchors.

Anchor Definition:
It is a single-line comment of form \`// @anchor[ANCHOR-ID]\` (use appropriate comment characters style for JavaScript/TypeScript, or # for Python/yaml) placed immediately before high-value architectural checkpoints, state-modifying gates, main API gates, secure functions, and database queries.
Key Anchor Locations:
- Security validation routines (Prefix: SEC-*)
- External API calls and SDK clients (Prefix: API-*)
- Database transactions, connection pooling, and operations (Prefix: DB-*)
- Important governance/business rules processes (Prefix: GOV-*)
- Router setups, gateway mappings, configs (Prefix: SYS-*)

Rules:
1. Do NOT overwhelm a file with anchors. Place exactly 1 or at most 2 anchors per file maximum.
2. Keep Anchor IDs capital letters, e.g. SEC-GATEWAY-AUTH, DB-CONNECT, etc.
3. Be careful to insert the anchor string directly in the code context as a valid line comment, and return the modified files.
4. Output must be valid, well-formed JSON conforming exactly to the schema below. Respond ONLY with the JSON string, and never write markdown blocks like \`\`\`json.

Expected Structure:
{
  "files": [
    {
       "name": "filename.ts",
       "content": "the full updated content with the inline @anchor comments inserted at logical places"
    }
  ],
  "anchors": [
    {
       "id": "SEC-GATEWAY-AUTH",
       "name": "Active Ingress Security Token Gate",
       "type": "Security Check",
       "file": "api-gateway.ts",
       "purpose": "Validates JSON Web Signatures in route headers before multiplexing payload down to services.",
       "severity": "high",
       "createdBy": "AnchorMesh AI Auto-Scan",
       "createdAt": "${new Date().toISOString()}"
    }
  ]
}

Codebase Files array:
${JSON.stringify(files.map((f: any) => ({ name: f.name, content: f.content, description: f.description })), null, 2)}
`;

          const rawText = await generateText(scanPrompt);
          const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          generatedOutput = JSON.parse(cleanedText);
          usedAI = true;
        } catch (aiError) {
          console.warn("AI generation failed, falling back to heuristic scanner:", aiError);
        }
      }

      // Safe, robust native scan fallback (Regular Expression parser)
      if (!generatedOutput) {
        const parsedFiles: any[] = [];
        const parsedAnchors: any[] = [];

        files.forEach((file: any) => {
          let lineAdded = false;
          const originalLines = file.content.split("\n");
          const modifiedLines: string[] = [];
          const lowerName = file.name.toLowerCase();

          for (let i = 0; i < originalLines.length; i++) {
            const line = originalLines[i];

            if (!lineAdded) {
              let tagId = "";
              let tagName = "";
              let tagType = "Business Logic";
              let tagPurpose = "";
              let tagSeverity: "low" | "medium" | "high" = "medium";

              if (line.includes("auth") || line.includes("login") || line.includes("protect") || line.includes("session") || line.includes("Crypto")) {
                tagId = `SEC-GATE-${file.name.split(".")[0].toUpperCase()}`;
                tagName = `Security Guard for ${file.name}`;
                tagType = "Security Check";
                tagPurpose = "Verifies user access controls, authentications, or token layers.";
                tagSeverity = "high";
              } else if (line.includes("db.") || line.includes("query") || line.includes("find") || line.includes("connect") || line.includes("save") || line.includes("insert")) {
                tagId = `DB-STORE-${file.name.split(".")[0].toUpperCase()}`;
                tagName = `Database Core Sink in ${file.name}`;
                tagType = "Database Query";
                tagPurpose = "Manages transactional writes or query retrievals across system stores.";
                tagSeverity = "medium";
              } else if (line.includes("fetch") || line.includes("axios") || line.includes("api.") || line.includes("http")) {
                tagId = `API-OUT-${file.name.split(".")[0].toUpperCase()}`;
                tagName = `External Outpost Connect in ${file.name}`;
                tagType = "External API";
                tagPurpose = "Initiates external HTTPS payloads to remote services and handles replies.";
                tagSeverity = "medium";
              } else if (line.includes("warning") || line.includes("deprecated") || line.includes("todo") || line.includes("legacy")) {
                tagId = `DEP-WARN-${file.name.split(".")[0].toUpperCase()}`;
                tagName = `Service Deprecation Guard in ${file.name}`;
                tagType = "Deprecated Warning";
                tagPurpose = "Tracks legacy system codes to prevent usage inside standard core pipelines.";
                tagSeverity = "low";
              }

              if (tagId !== "" && !parsedAnchors.some((a: any) => a.id === tagId)) {
                const commentPrefix = lowerName.endsWith(".py") || lowerName.endsWith(".yaml") || lowerName.endsWith(".yml") ? "#" : "//";
                modifiedLines.push(`${commentPrefix} @anchor[${tagId}] - ${tagName}`);
                lineAdded = true;

                parsedAnchors.push({
                  id: tagId,
                  name: tagName,
                  type: tagType,
                  file: file.name,
                  purpose: tagPurpose,
                  severity: tagSeverity,
                  createdBy: "AnchorMesh Heuristic Scanner",
                  createdAt: new Date().toISOString()
                });
              }
            }
            modifiedLines.push(line);
          }

          parsedFiles.push({
            name: file.name,
            content: modifiedLines.join("\n"),
            description: file.description || "Ingested user code file."
          });
        });

        generatedOutput = { files: parsedFiles, anchors: parsedAnchors };
      }

      return res.status(200).json({
        success: true,
        engine: usedAI ? `${MODEL_PROVIDER} auto-scan` : "AnchorMesh Local Engine",
        files: generatedOutput.files,
        anchors: generatedOutput.anchors
      });

    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message || "Failed to analyze codebase folders." });
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
