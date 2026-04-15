interface Env {
  DB: D1Database;
  ADMIN_PASSWORD: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  // Simple auth check via header for this demo
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== "Bearer mock-admin-token") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const entry = await request.json() as {
    character: string;
    pinyin: string;
    type: string;
    definitions: string[];
    examples: { text: string; source: string }[];
  };

  if (!entry.character || !entry.pinyin) {
    return new Response(JSON.stringify({ error: "Character and Pinyin are required" }), { status: 400 });
  }

  try {
    await env.DB.prepare(
      "INSERT INTO dictionary (character, pinyin, type, definitions, examples) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      entry.character,
      entry.pinyin,
      entry.type,
      JSON.stringify(entry.definitions),
      JSON.stringify(entry.examples)
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("D1 Insert Error:", error);
    return new Response(JSON.stringify({ error: "Failed to add entry" }), { status: 500 });
  }
};
