-- 雅言智选 D1 数据库架构
DROP TABLE IF EXISTS dictionary;
CREATE TABLE dictionary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character TEXT NOT NULL,
    pinyin TEXT NOT NULL,
    type TEXT,
    definitions TEXT, -- JSON string
    examples TEXT,    -- JSON string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始数据示例
INSERT INTO dictionary (character, pinyin, type, definitions, examples) VALUES 
('之', 'zhī', '实词/虚词', '["助词，的。","代词，它、他、她。","动词，到、往。"]', '[{"text":"之子于归，宜其室家。","source":"《诗经·周南·桃夭》"}]');
