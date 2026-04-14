interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { searchParams } = new URL(context.request.url);
  const word = searchParams.get("word");

  if (!word) {
    return new Response(JSON.stringify({ error: "Word is required" }), { status: 400 });
  }

  try {
    const result = await context.env.DB.prepare(
      "SELECT * FROM dictionary WHERE character = ?"
    ).bind(word).first();

    if (result) {
      // 解析存储为字符串的 JSON 字段
      return new Response(JSON.stringify({
        ...result,
        definitions: JSON.parse(result.definitions as string),
        examples: JSON.parse(result.examples as string)
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }
};
