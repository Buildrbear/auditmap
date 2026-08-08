const assert = require("node:assert/strict");
const {
  currentKnowledge,
  matchingQuestionKey,
  questionKey,
} = require("../api/_lib/question-knowledge");

const future = new Date(Date.now() + 86_400_000).toISOString();
const source = [{ title: "Official park source", url: "https://example.gov/park" }];

const existingParkingKey = questionKey("Where should I park at Dix Park?");
assert.equal(
  matchingQuestionKey("Where can I park at Dix Park?", [{
    question_key: existingParkingKey,
    sample_question: "Where should I park at Dix Park?",
    intent_key: "parking",
  }]),
  existingParkingKey,
);
assert.notEqual(
  matchingQuestionKey("Where is the restroom at Dix Park?", [{
    question_key: existingParkingKey,
    sample_question: "Where should I park at Dix Park?",
    intent_key: "parking",
  }]),
  existingParkingKey,
);

assert.equal(
  currentKnowledge({
    canonical_answer: "An AI draft with a source still requires review.",
    answer_status: "needs_verification",
    answer_sources: source,
    expires_at: future,
  }),
  null,
);

assert.equal(
  currentKnowledge({
    canonical_answer:
      "The closest match in the current AuditMap records is Dix Park. Open a result below.",
    answer_status: "answered",
    answer_sources: source,
    expires_at: future,
  }),
  null,
);

assert.equal(
  currentKnowledge({
    canonical_answer: "Parking is in the visitor lot beside the east entrance.",
    answer_status: "answered",
    answer_sources: [],
    expires_at: future,
  }),
  null,
);

assert.equal(
  currentKnowledge({
    canonical_answer: "Parking is in the visitor lot beside the east entrance.",
    answer_status: "answered",
    answer_sources: source,
    expires_at: future,
  }).answer,
  "Parking is in the visitor lot beside the east entrance.",
);

console.log("Question knowledge quality tests passed.");
