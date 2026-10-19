// @ts-check
/* 配置层：画布尺寸、配色、字体
 * 所有绘制尺寸都以 1600×900 的设计坐标为基准，运行时整体等比缩放。
 */

window.RC = window.RC || /** @type {any} */ ({});

/** @type {ConfigShape} */
RC.config = {
  // 设计画布
  DW: 1600,
  DH: 900,

  // 布局
  layout: {
    pad: 26,
    headerH: 92,
    gap: 18,
    leftW: 340,
    rightW: 400
  },

  // 配色（与课件一致）
  colors: {
    bg: "#0E1712",
    panel: "#F7F4EC",
    card: "#FBFAF6",
    ink: "#1A231D",
    sub: "#68746C",
    line: "#E2DCCB",
    green: "#1E5B43",
    green2: "#3E7D60",
    rust: "#C0502A",
    dim: "#9AA79F",
    white: "#FFFFFF",
    hdrSub: "#9DB5A8",
    hdrHint: "#6F8C7C",
    trackBg: "#E7EAE4",
    trackLose: "#C6D0C8",
    featOnBg: "#E9F1EC",
    featOnLine: "#B9D3C4",
    featHover: "#F1EFE6",
    btnHover: "#EFEDE3",
    subTextOnGreen: "#BCDCCB"
  },

  font: '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",' +
        '"Noto Sans CJK SC","Source Han Sans SC","WenQuanYi Micro Hei",sans-serif',

  // 判定阈值（用于文案，不参与计算）
  thresholds: {
    high: 32,   // 领先超过 32 个百分点 -> 把握较高
    low: 14     // 低于 14 个百分点 -> 几乎分不出来
  }
};
