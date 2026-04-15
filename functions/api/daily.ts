interface Env {
  DB: D1Database;
}

const FALLBACK_DICTIONARY = [
  {
    character: "之",
    pinyin: "zhī",
    type: "实词/虚词",
    definitions: ["助词，的。", "代词，它、他、她。", "动词，到、往。"],
    examples: [{ text: "之子于归，宜其室家。", source: "《诗经·周南·桃夭》" }]
  },
  {
    character: "其",
    pinyin: "qí",
    type: "虚词",
    definitions: ["代词，他的，他们的。", "指示代词，那，那个。", "副词，表示推测、反问、祈使等。"],
    examples: [{ text: "其为人也孝弟。", source: "《论语·学而》" }]
  }
];

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    let entry;
    
    if (context.env.DB) {
      const result = await context.env.DB.prepare(
        "SELECT * FROM dictionary ORDER BY RANDOM() LIMIT 1"
      ).first();

      if (result) {
        entry = {
          ...result,
          definitions: JSON.parse(result.definitions as string),
          examples: JSON.parse(result.examples as string)
        };
      }
    }

    // Fallback if DB is empty or not bound
    if (!entry) {
      entry = FALLBACK_DICTIONARY[Math.floor(Math.random() * FALLBACK_DICTIONARY.length)];
    }

    return new Response(JSON.stringify({
      entry,
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(entry.character)}/800/450`,
      quote: "博观而约取，厚积而薄发。"
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    // Even if error occurs, try to return fallback
    const entry = FALLBACK_DICTIONARY[0];
    return new Response(JSON.stringify({
      entry,
      imageUrl: `https://picsum.photos/seed/fallback/800/450`,
      quote: "博观而约取，厚积而薄发。"
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
