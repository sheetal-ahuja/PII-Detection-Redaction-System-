import { pipeline } from "@huggingface/transformers";

// Singleton NER pipeline loader
let nerPipeline: any | null = null;

async function loadPipeline() {
  if (!nerPipeline) {
    nerPipeline = await pipeline(
      "token-classification",
      "Xenova/bert-base-NER",
      {
        // Try to use WebGPU when available for speed; falls back automatically
        // @ts-ignore - device option is accepted by transformers.js
        device: "webgpu",
      }
    );
  }
  return nerPipeline;
}

export interface PersonEntity {
  text: string;
  start: number;
  end: number;
  confidence: number; // 0-1
}

// Detect PERSON entities and return consolidated spans
export async function getPersonEntities(text: string): Promise<PersonEntity[]> {
  if (!text || !text.trim()) return [];
  const ner = await loadPipeline();
  const output = await ner(text, { aggregation_strategy: 'simple' });

  // transformers.js with aggregation_strategy returns entries like:
  // { entity_group: 'PER', score: 0.98, word: 'John Doe', start: 0, end: 8 }
  const persons: PersonEntity[] = [];

  for (const ent of output) {
    const group = (ent.entity_group || ent.label || ent.entity || "").toString().toUpperCase();
    if (group === "PER" || group === "PERSON") {
      persons.push({
        text: ent.word,
        start: ent.start,
        end: ent.end,
        confidence: Math.max(0, Math.min(1, Number(ent.score) || 0)),
      });
    }
  }

  // De-duplicate by span
  const seen = new Set<string>();
  return persons.filter((p) => {
    const key = `${p.start}-${p.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
