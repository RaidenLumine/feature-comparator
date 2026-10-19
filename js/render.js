// @ts-check
/* 绘制层：全部用 Canvas 2D 绘制，不依赖任何图形库
 * 对外只暴露 init / resize / draw / toDesign / hitTest
 */

window.RC = window.RC || /** @type {any} */ ({});

RC.render = (function () {
  var cfg = RC.config;
  var C = cfg.colors;
  var L = cfg.layout;

  /** @type {HTMLCanvasElement | null} */
  var canvas = null;
  /** @type {CanvasRenderingContext2D | null} */
  var ctx = null;

  var cssW = 0;
  var cssH = 0;
  var scale = 1;
  var offX = 0;
  var offY = 0;
  var dpr = 1;

  /** @type {HitArea[]} */
  var hits = [];

  /* ---------- 基础图形 ---------- */

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {number} r
   * @param {string | null} fill
   * @param {string | null} [stroke]
   * @param {number} [lw]
   */
  function roundRect(x, y, w, h, r, fill, stroke, lw) {
    if (!ctx) return;
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }

  /**
   * @param {string} str
   * @param {number} x
   * @param {number} y
   * @param {number} size
   * @param {string} color
   * @param {boolean} [bold]
   * @param {CanvasTextAlign} [align]
   * @param {CanvasTextBaseline} [baseline]
   */
  function text(str, x, y, size, color, bold, align, baseline) {
    if (!ctx) return;
    ctx.font = (bold ? "bold " : "") + size + "px " + cfg.font;
    ctx.fillStyle = color;
    ctx.textAlign = align || "left";
    ctx.textBaseline = baseline || "top";
    ctx.fillText(str, x, y);
  }

  /**
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {string} color
   * @param {number} [width]
   */
  function line(x1, y1, x2, y2, color, width) {
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {string} id
   * @param {() => void} action
   */
  function hit(x, y, w, h, id, action) {
    hits.push({ x: x, y: y, w: w, h: h, id: id, action: action });
  }

  /* ---------- 图片等比绘制 ---------- */

  /**
   * @param {Record<string, HTMLImageElement | null>} images
   * @param {string} key
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {"left" | "center"} align
   * @returns {{x:number,y:number,w:number,h:number} | null}
   */
  function drawFit(images, key, x, y, w, h, align) {
    if (!ctx) return null;
    var im = images[key];
    if (!im) return null;
    var s = Math.min(w / im.width, h / im.height);
    var dw = im.width * s;
    var dh = im.height * s;
    var dx = align === "center" ? x + (w - dw) / 2 : x;
    var dy = y + (h - dh) / 2;
    ctx.drawImage(im, dx, dy, dw, dh);
    return { x: dx, y: dy, w: dw, h: dh };
  }

  /* ---------- 页面区块 ---------- */

  function drawHeader() {
    if (!ctx) return;
    ctx.fillStyle = C.green2;
    ctx.fillRect(26, 26, 4, 34);

    text("特征比对器", 40, 22, 30, C.white, true);
    text("把叶片的特征变成数字，再比较谁更像谁", 40, 62, 13, C.hdrSub);
    text("1–4 换样本　　Q / W / E 开关特征　　M 手动填卡　　R 重置　　F11 全屏",
         cfg.DW - 26, 34, 11, C.hdrHint, false, "right");
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  function drawPanel(x, y, w, h) {
    if (!ctx) return;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.32)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 8;
    roundRect(x, y, w, h, 16, C.panel, null, 0);
    ctx.restore();
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} title
   * @param {string} en
   */
  function panelTitle(x, y, title, en) {
    text(title, x + 22, y + 18, 15, C.green, true);
    text(en, x + 22, y + 44, 9, C.dim);
  }

  /**
   * @param {Record<string, HTMLImageElement | null>} images
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  function drawReferences(images, x, y, w, h) {
    panelTitle(x, y, "参考库", "R E F E R E N C E");

    var top = y + 66;
    var cardH = (h - 96 - 58) / 2;
    var slotW = 150;

    RC.data.refOrder.forEach(function (key, i) {
      var cy = top + i * cardH;
      var ref = RC.data.refs[key];

      drawFit(images, key, x + 24, cy + 13, slotW, cardH - 26, "left");

      var tx = x + 24 + slotW + 16;
      text(ref.name, tx, cy + cardH / 2 - 56, 22, C.ink, true);
      text(ref.desc, tx, cy + cardH / 2 - 16, 10, C.sub);
      text("[ " + ref.vec.map(function (v) { return v.toFixed(2); }).join("  ") + " ]",
           tx, cy + cardH / 2 + 10, 9, C.dim);

      if (i === 0) {
        line(x + 22, cy + cardH - 8, x + w - 22, cy + cardH - 8, C.line, 1);
      }
    });

    text("参考库里每一株，都提前算好一组特征值。", x + 22, y + h - 74, 9.5, C.sub);
  }

  /* ---------- 顶部按钮行（图片模式 4 个 + 手动模式 1 个） ---------- */

  /**
   * @param {AppState} state
   * @param {string | null} hoverId
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @returns {number} 按钮行底部 y 坐标
   */
  function drawSourceButtons(state, hoverId, x, y, w) {
    var btnY = y + 62;
    var btnH = 44;
    var bgap = 8;

    /** @type {{id:string,label:string,sub:string,on:boolean,accent?:boolean}[]} */
    var items = RC.data.samples.map(function (s, i) {
      return {
        id: "sample:" + s.key,
        label: s.label,
        sub: String(i + 1),
        on: !state.manual && state.sample === s.key
      };
    });
    items.push({ id: "manual", label: "手动填卡", sub: "M", on: state.manual, accent: true });

    var n = items.length;
    var bw = (w - 44 - bgap * (n - 1)) / n;

    items.forEach(function (it, i) {
      var bx = x + 22 + i * (bw + bgap);
      var hot = hoverId === it.id;

      var fill = it.on ? (it.accent ? C.rust : C.green) : (hot ? C.btnHover : C.card);
      var stroke = it.on ? (it.accent ? C.rust : C.green) : C.line;

      roundRect(bx, btnY, bw, btnH, 8, fill, stroke, 1);
      text(it.label, bx + bw / 2, btnY + 9, it.accent ? 10 : 10.5,
           it.on ? C.white : C.ink, true, "center");
      text(it.sub, bx + bw / 2, btnY + 28, 8,
           it.on ? C.subTextOnGreen : C.dim, false, "center");

      hit(bx, btnY, bw, btnH, it.id, function () {
        if (it.id === "manual") state.onManual();
        else state.onSample(it.id.slice(7));
      });
    });

    return btnY + btnH;
  }

  /* ---------- 图片模式：主图 + 特征开关 ---------- */

  /**
   * @param {Record<string, HTMLImageElement | null>} images
   * @param {AppState} state
   * @param {string | null} hoverId
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {number} btnBottom
   */
  function drawImageSample(images, state, hoverId, x, y, w, h, btnBottom) {
    var areaTop = btnBottom + 14;
    var chipsTop = y + h - 84;
    var areaH = chipsTop - areaTop - 62;

    drawFit(images, state.sample, x + 40, areaTop, w - 80, areaH - 10, "center");

    var hint = "";
    RC.data.samples.forEach(function (s) {
      if (s.key === state.sample) hint = s.hint;
    });
    // 右对齐，避免与左下角"参与比较的特征"标签重叠
    text(hint, x + w - 24, chipsTop - 22, 9, C.dim, false, "right");

    drawFeatureChips(state, hoverId, x, chipsTop, w, RC.data.sampleData[state.sample].vec);
  }

  /* ---------- 手动模式：三个选项组 ---------- */

  /**
   * @param {AppState} state
   * @param {string | null} hoverId
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {number} btnBottom
   */
  function drawManualSample(state, hoverId, x, y, w, h, btnBottom) {
    var top = btnBottom + 18;

    text("卡片上写什么，就点什么", x + 26, top, 11.5, C.sub);
    text("你选的每一项，机器都会读成一个数字", x + 26, top + 22, 10, C.dim);

    var vec = RC.engine.vectorFromChoices(state.choices);

    var labelW = 96;
    var optW = 190;
    var optGap = 16;
    var optH = 64;

    // 三行 + 向量区在说明与 chips 之间垂直居中
    var contentTop = top + 76;
    var contentBottom = y + h - 84 - 34;
    var rowH = 120;
    var rowsH = rowH * RC.data.manualMap.length;
    var vecH = 62;
    var spare = Math.max(0, (contentBottom - contentTop) - (rowsH + vecH));
    var rowTop = contentTop + spare * 0.34;

    var totalW = labelW + optW * 2 + optGap;
    var ox = x + (w - totalW) / 2;

    RC.data.manualMap.forEach(function (group, gi) {
      var ry = rowTop + gi * rowH;

      text(group.feature, ox, ry + optH / 2 - 11, 16, C.ink, true);

      group.options.forEach(function (opt, oi) {
        var bx = ox + labelW + oi * (optW + optGap);
        var selected = state.choices[gi] === opt.key;
        var hot = hoverId === "choice:" + gi + ":" + opt.key;

        roundRect(bx, ry, optW, optH, 10,
                  selected ? C.green : (hot ? C.btnHover : C.card),
                  selected ? C.green : C.line, 1);

        text(opt.label, bx + optW / 2, ry + 11, 15,
             selected ? C.white : C.ink, true, "center");
        text(opt.value.toFixed(2), bx + optW / 2, ry + 38, 10,
             selected ? C.subTextOnGreen : C.dim, false, "center");

        hit(bx, ry, optW, optH, "choice:" + gi + ":" + opt.key, function () {
          state.onChoice(gi, opt.key);
        });
      });
    });

    // 当前向量
    var vy = rowTop + rowsH + 14;
    line(x + 26, vy, x + w - 26, vy, C.line, 1);
    text("机器读到的三个数", x + 26, vy + 12, 9.5, C.dim);
    text("[ " + vec.map(function (v) { return v.toFixed(2); }).join("   ") + " ]",
         x + 26, vy + 34, 16, C.green, true);

    drawFeatureChips(state, hoverId, x, y + h - 84, w, vec);
  }

  /* ---------- 特征开关（两种模式共用） ---------- */

  /**
   * @param {AppState} state
   * @param {string | null} hoverId
   * @param {number} x
   * @param {number} chipsTop
   * @param {number} w
   * @param {FeatureVector} vec
   */
  function drawFeatureChips(state, hoverId, x, chipsTop, w, vec) {
    text("参与比较的特征", x + 24, chipsTop - 22, 9, C.dim);

    var fw = (w - 44 - 16) / 3;

    RC.data.features.forEach(function (name, i) {
      var fx = x + 22 + i * (fw + 8);
      var on = state.enabled[i];
      var hot = hoverId === "feat:" + i;

      roundRect(fx, chipsTop, fw, 58, 9,
                on ? C.featOnBg : (hot ? C.featHover : C.card),
                on ? C.featOnLine : C.line, 1);

      text(name, fx + fw / 2, chipsTop + 9, 13, on ? C.ink : C.dim, true, "center");
      text(on ? vec[i].toFixed(2) : "不参与",
           fx + fw / 2, chipsTop + 38, 9,
           on ? C.sub : C.dim, false, "center");

      hit(fx, chipsTop, fw, 58, "feat:" + i, function () {
        state.onToggleFeature(i);
      });
    });
  }

  /**
   * @param {Record<string, HTMLImageElement | null>} images
   * @param {AppState} state
   * @param {string | null} hoverId
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  function drawSample(images, state, hoverId, x, y, w, h) {
    panelTitle(x, y, state.manual ? "照卡片填" : "待识别样本",
               state.manual ? "MANUAL ENTRY" : "S A M P L E");

    var btnBottom = drawSourceButtons(state, hoverId, x, y, w);

    if (state.manual) {
      drawManualSample(state, hoverId, x, y, w, h, btnBottom);
    } else {
      drawImageSample(images, state, hoverId, x, y, w, h, btnBottom);
    }
  }

  /* ---------- 右：比对结果 ---------- */

  /**
   * @param {AppState} state
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  function drawResult(state, x, y, w, h) {
    panelTitle(x, y, "比对结果", "R E S U L T");

    text("最像的是", x + 24, y + 70, 10.5, C.sub);

    var winner = state.result.winner;

    if (winner) {
      var ref = RC.data.refs[winner];
      var color = state.result.margin > RC.config.thresholds.low ? C.green : C.rust;
      text(ref.name, x + 22, y + 92, 52, color, true);
    } else if (ctx) {
      // 没有可用特征：画一条短横线占位
      ctx.save();
      ctx.strokeStyle = C.dim;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 26, y + 140);
      ctx.lineTo(x + 86, y + 140);
      ctx.stroke();
      ctx.restore();
    }

    var conf;
    if (winner) {
      conf = "相似度 " + Math.round(state.result.pct[winner]) +
             "%　·　领先 " + Math.round(state.result.margin) + " 个百分点　·　" +
             RC.engine.confidenceText(state.result);
    } else {
      conf = "没有启用任何特征，机器无从判断";
    }
    text(conf, x + 24, y + 190, 9.5, C.sub);

    var barsTop = y + 236;
    RC.data.refOrder.forEach(function (key, i) {
      var by = barsTop + i * 74;
      var val = state.shown[key === "jia" ? "jia" : "yi"];
      var win = winner === key;

      text(RC.data.refs[key].name, x + 24, by, 13, win ? C.ink : C.sub, true);
      text(winner ? Math.round(val) + "%" : "—",
           x + w - 24, by - 4, 17, win ? C.green : C.dim, true, "right");

      var ty = by + 26;
      roundRect(x + 24, ty, w - 48, 16, 8, C.trackBg, null, 0);
      if (val > 0.5) {
        var fwid = (w - 48) * (val / 100);
        if (fwid > 8) {
          roundRect(x + 24, ty, fwid, 16, 8, win ? C.green : C.trackLose, null, 0);
        }
      }
    });

    line(x + 24, y + h - 92, x + w - 24, y + h - 92, C.line, 1);
    text(RC.engine.note(state.result, state.manual), x + 24, y + h - 76, 11, C.sub);

    if (state.flash > 0.02 && ctx) {
      ctx.save();
      ctx.globalAlpha = state.flash * 0.5;
      roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 16, null, C.green2, 2);
      ctx.restore();
    }
  }

  /* ---------- 对外接口 ---------- */

  return {
    /**
     * @param {HTMLCanvasElement} el
     */
    init: function (el) {
      canvas = el;
      ctx = /** @type {CanvasRenderingContext2D} */ (el.getContext("2d"));
    },

    resize: function () {
      if (!canvas) return;
      cssW = window.innerWidth;
      cssH = window.innerHeight;
      dpr = window.devicePixelRatio || 1;

      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";

      scale = Math.min(cssW / cfg.DW, cssH / cfg.DH);
      offX = (cssW - cfg.DW * scale) / 2;
      offY = (cssH - cfg.DH * scale) / 2;
    },

    /**
     * @param {number} clientX
     * @param {number} clientY
     * @returns {{x:number,y:number}}
     */
    toDesign: function (clientX, clientY) {
      if (!canvas) return { x: 0, y: 0 };
      var r = canvas.getBoundingClientRect();
      return {
        x: (clientX - r.left - offX) / scale,
        y: (clientY - r.top - offY) / scale
      };
    },

    /**
     * @param {number} px
     * @param {number} py
     * @returns {HitArea | null}
     */
    hitTest: function (px, py) {
      for (var i = hits.length - 1; i >= 0; i--) {
        var h = hits[i];
        if (px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h) {
          return h;
        }
      }
      return null;
    },

    /**
     * @param {AppState} state
     * @param {Record<string, HTMLImageElement | null>} images
     * @param {string | null} hoverId
     */
    draw: function (state, images, hoverId) {
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, cssW, cssH);

      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
      hits = [];

      var pad = L.pad;
      var headH = L.headerH;
      var gap = L.gap;
      var leftW = L.leftW;
      var rightW = L.rightW;
      var centerW = cfg.DW - pad * 2 - leftW - rightW - gap * 2;

      var py = headH;
      var ph = cfg.DH - headH - pad;

      var lx = pad;
      var cx = lx + leftW + gap;
      var rx = cx + centerW + gap;

      drawHeader();

      drawPanel(lx, py, leftW, ph);
      drawPanel(cx, py, centerW, ph);
      drawPanel(rx, py, rightW, ph);

      drawReferences(images, lx, py, leftW, ph);
      drawSample(images, state, hoverId, cx, py, centerW, ph);
      drawResult(state, rx, py, rightW, ph);

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
    }
  };
})();
