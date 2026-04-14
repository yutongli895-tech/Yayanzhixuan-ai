interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    // 查询 D1 数据库中的词条总数
    const result = await env.DB.prepare("SELECT COUNT(*) as count FROM dictionary").first<{ count: number }>();
    
    return new Response(JSON.stringify({
      database: "connected",
      count: result?.count || 0,
      provider: "Cloudflare D1"
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("D1 Error:", error);
    
    // 如果数据库未绑定或表不存在，返回错误状态
    return new Response(JSON.stringify({
      database: "error",
      count: 0,
      provider: "Cloudflare D1 (Not Bound/Table Missing)"
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }
};
