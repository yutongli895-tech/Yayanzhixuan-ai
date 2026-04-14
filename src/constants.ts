import { DictionaryEntry } from "./types";

export const MOCK_DICTIONARY: Record<string, DictionaryEntry> = {
  "之": {
    character: "之",
    pinyin: "zhī",
    type: "实词/虚词",
    definitions: [
      "助词，的。",
      "代词，它、他、她。",
      "动词，到、往。"
    ],
    examples: [
      {
        text: "之子于归，宜其室家。",
        source: "《诗经·周南·桃夭》"
      },
      {
        text: "辍耕之垄上。",
        source: "《史记·陈涉世家》"
      }
    ]
  },
  "其": {
    character: "其",
    pinyin: "qí",
    type: "虚词",
    definitions: [
      "代词，他的，他们的。",
      "指示代词，那，那个。",
      "副词，表示推测、反问、祈使等。"
    ],
    examples: [
      {
        text: "其为人也孝弟。",
        source: "《论语·学而》"
      }
    ]
  },
  "而": {
    character: "而",
    pinyin: "ér",
    type: "虚词",
    definitions: [
      "连词，表示并列、递进、转折、承接等。",
      "代词，通“尔”，你。"
    ],
    examples: [
      {
        text: "学而时习之。",
        source: "《论语·学而》"
      }
    ]
  }
};
