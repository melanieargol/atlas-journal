export type AnalysisRegressionFixture = {
  id: string;
  entry: string;
  expected: {
    primaryEmotionIncludes: string[];
    stressors?: string[];
    supports?: string[];
    copingActions?: string[];
    restorativeSignals?: string[];
    topics?: string[];
    personalKeywords?: string[];
    movementNot?: string[];
  };
};

export const analysisRegressionFixtures: AnalysisRegressionFixture[] = [
  {
    id: "family-illness-caregiving-hope",
    entry:
      "I had a busy day programming. I got so much done. I was upset, because my daughter Flora was sick. I am hoping she is better by morning. I made some homemade chicken soup. I hope it heals her!",
    expected: {
      primaryEmotionIncludes: ["concerned", "hopeful"],
      stressors: ["family health concern"],
      supports: ["productive progress"],
      copingActions: ["made something nourishing to care for someone"],
      restorativeSignals: ["moment of hope"],
      topics: ["caregiving", "illness", "productivity"],
      personalKeywords: ["Flora"],
      movementNot: ["unchanged"]
    }
  },
  {
    id: "upset-because-loved-one-is-sick",
    entry:
      "I was upset because my son has a fever. I kept checking on him and hoping the medicine would help him sleep.",
    expected: {
      primaryEmotionIncludes: ["concerned", "hopeful"],
      stressors: ["family health concern"],
      copingActions: ["showed up to care for someone directly"],
      restorativeSignals: ["moment of hope"],
      topics: ["caregiving", "illness"],
      movementNot: ["unchanged"]
    }
  },
  {
    id: "mixed-productivity-and-care",
    entry:
      "I wrapped up finals work and felt proud of how much I got done. Later I got worried because my mom sounded really sick, so I brought her soup and hoped she would feel better by morning.",
    expected: {
      primaryEmotionIncludes: ["concerned", "hopeful", "proud"],
      stressors: ["family health concern"],
      supports: ["academic achievement", "productive progress"],
      copingActions: ["made something nourishing to care for someone"],
      topics: ["caregiving", "illness", "academic achievement"],
      movementNot: ["unchanged"]
    }
  }
];
