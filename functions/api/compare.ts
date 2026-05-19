interface Env {
  NVIDIA_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<any>();
  const { words } = body;

  if (!Array.isArray(words) || words.length < 2) {
    return new Response(
      JSON.stringify({ error: "At least two words are required" }),
      { status: 400 }
    );
  }

  const apiKeys = (env.NVIDIA_API_KEY || "")
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);

  if (apiKeys.length === 0) {
    return new Response(
      JSON.stringify({ error: "NVIDIA_API_KEY is not configured" }),
      { status: 500 }
    );
  }

  const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

  const systemPrompt = `
你是一位文言文词汇专家。
请对比以下文言词汇在词性、用法、语境和例句上的异同。

请以 **严格 JSON 格式** 返回，不要包含任何解释性文字。

字段要求：
- words: 对比的词语数组
- similarities: 相同点的字符串数组
- differences: 差异点数组，每项包含 aspect 和 explanations
- summary: 总体总结
`;

  const userPrompt = `请对比以下文言词汇：\n\n${words.join("、")}`;

  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen2.5-72b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";

    // ✅ JSON 容错（NVIDIA 有时会乱输出）
    let result: any;
    try {
      result = JSON.parse(raw);
    } catch {
      const m = raw.match(/{[\s\S]*}/);
      if (m) {
        result = JSON.parse(m[0]);
      } else {
        throw new Error("AI 返回的不是合法 JSON");
      }
    }

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "AI Comparison Failed" }),
      { status: 500 }
    );
  }
};
