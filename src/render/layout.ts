import { CANVAS } from './palette.js';

/**
 * Layout tokens for the 1072x1448 portrait canvas. All values are physical
 * pixels at 300 ppi. Tuned by visual inspection of the rendered PNG.
 */
export const layout = {
  canvas: CANVAS,
  margin: 64,

  header: {
    baselineY: 108,
    labelSize: 30,
    ruleY: 148,
  },

  clock: {
    y: 228,
    digitWidth: 152,
    digitHeight: 320,
    thickness: 34,
    digitGap: 40,
    colonWidth: 64,
    dateBaselineY: 642,
    dateSize: 46,
  },

  weather: {
    ruleY: 704,
    labelBaselineY: 758,
    iconX: 64,
    iconY: 786,
    iconSize: 204,
    tempX: 330,
    tempBaselineY: 936,
    tempSize: 168,
    conditionX: 640,
    conditionBaselineY: 856,
    conditionSize: 36,
    detailSize: 30,
    detailLineHeight: 48,
  },

  cards: {
    ruleY: 1030,
    dividerX: 536,
    labelOffset: 54,
    labelSize: 27,
    valueSize: 96,
    valueOffset: 172,
    subOffset: 226,
    metaOffset: 270,
    subSize: 27,
    metaSize: 26,
    bottomRuleY: 1312,
  },

  footer: {
    spreadBaselineY: 1360,
    line1BaselineY: 1404,
    line2BaselineY: 1440,
    size: 25,
  },
} as const;
