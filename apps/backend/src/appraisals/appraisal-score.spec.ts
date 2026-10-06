import { calculateScore, type ScoreCriterion } from './appraisal-score';

describe('calculateScore', () => {
  const criteria: ScoreCriterion[] = [
    { id: 'a', scaleMax: 5, weight: 50 },
    { id: 'b', scaleMax: 10, weight: 50 },
  ];

  it('normalizes mixed scales and sums weighted values', () => {
    const score = calculateScore(
      [
        { criterionId: 'a', rating: 4 },
        { criterionId: 'b', rating: 8 },
      ],
      criteria,
    );
    expect(score).toBe(80);
  });

  it('returns null when any rating is missing', () => {
    expect(calculateScore([{ criterionId: 'a', rating: 4 }], criteria)).toBeNull();
  });

  it('rounds to 2 decimals', () => {
    const score = calculateScore(
      [
        { criterionId: 'a', rating: 3 },
        { criterionId: 'b', rating: 7 },
      ],
      [
        { id: 'a', scaleMax: 5, weight: 33.33 },
        { id: 'b', scaleMax: 10, weight: 66.67 },
      ],
    );
    expect(score).toBe(66.67);
  });

  it('returns null when there are no criteria', () => {
    expect(calculateScore([], [])).toBeNull();
  });
});
