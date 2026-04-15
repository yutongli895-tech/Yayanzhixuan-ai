interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // 获取随机词条
    const result = await context.env.DB.prepare(
      "SELECT * FROM dictionary ORDER BY RANDOM() LIMIT 1"
    ).first();

    if (result) {
      const entry = {
        ...result,
        definitions: JSON.parse(result.definitions as string),
        examples: JSON.parse(result.examples as string)
      };

      return new Response(JSON.stringify({
        entry,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(result.character as string)}/800/450`,
        quote: "博观而约取，厚积而薄发。"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "No entries found" }), { status: 404 });
  } catch (error) {
    console.error("D1 Error:", error);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }
};
