interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    if (env.DB) {
      const result = await env.DB.prepare("SELECT COUNT(*) as count FROM dictionary").first<{ count: number }>();
      
      return new Response(JSON.stringify({
        database: "connected",
        count: result?.count || 0,
        provider: "Cloudflare D1"
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    throw new Error("DB not bound");
  } catch (error) {
    console.error("D1 Error:", error);
    
    return new Response(JSON.stringify({
      database: "error",
      count: 0,
      provider: "Cloudflare D1 (Not Bound/Table Missing)"
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }
};
