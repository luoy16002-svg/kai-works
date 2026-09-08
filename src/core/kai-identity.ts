export type IdentityPoint = readonly [number, number];
export type IdentityStroke = readonly [IdentityPoint, IdentityPoint, IdentityPoint, IdentityPoint];

export const KAI_WIDTH = 510;
export const KAI_HEIGHT = 240;

// Seven flat cuts. The small opening at K's hinge and A's counter carry the identity.
export const KAI_STROKES: readonly IdentityStroke[] = [
  [
    [0, 0],
    [42, 0],
    [42, 240],
    [0, 240],
  ],
  [
    [48, 113],
    [138, 0],
    [191, 0],
    [98, 118],
  ],
  [
    [52, 127],
    [102, 121],
    [200, 240],
    [146, 240],
  ],
  [
    [229, 240],
    [305, 0],
    [341, 0],
    [278, 240],
  ],
  [
    [315, 0],
    [351, 0],
    [430, 240],
    [380, 240],
  ],
  [
    [272, 156],
    [381, 156],
    [394, 196],
    [260, 196],
  ],
  [
    [466, 0],
    [510, 0],
    [510, 240],
    [466, 240],
  ],
];

export const KAI_PATHS = KAI_STROKES.map(
  (stroke) => `M${stroke.map(([x, y]) => `${x} ${y}`).join('L')}Z`,
);
