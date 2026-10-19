/* 绘制层：全部用 Canvas 2D 绘制，不依赖任何图形库
 * 对外只暴露 init / resize / draw / toDesign / hitTest
 */
window.RC = window.RC || {};

RC.render = (function () {
  var cfg = RC.config;
  var C = cfg.colors;
  var L = cfg.layout;

  var canvas = null;
  var ctx = null;

  var cssW = 0, cssH = 0;
  var scale = 1, offX = 0, offY = 0, dpr = 1;

  var hits = [];

  /* ---------- 基础图形 ---------- */

  function roundRect(x, y, w, h, r, fill, stroke, lw) {
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

  function text(str, x, y, size, color, bold, align, baseline) {
    ctx.font = (bold ? "bold " : "") + size + "px " + cfg.font;
    ctx.fillStyle = color;
    ctx.textAlign = align || "left";
    ctx.textBaseline = baseline || "top";
    ctx.fillText(str, x, y);
  }

  function line(x1, y1, x2, y2, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function hit(x, y, w, h, id, action) {
    hits.push({ x: x, y: y, w: w, h: h, id: id, action: action });
  }

  /* ---------- 图片等比绘制 ---------- */

  function drawFit(images, key, x, y, w, h, align) {
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
    // 左侧强调竖线
    ctx.fillStyle = C.green2;
    ctx.fillRect(26, 26, 4, 34);

    text("特征比对器", 40, 22, 30, C.white, true);
    text("把叶片的特征变成数字，再比较谁更像谁", 40, 62, 13, C.hdrSub);
    text("1–4 换样本　　Q / W / E 开关特征　　R 重置　　F11 全屏",
         cfg.DW - 26, 34, 11, C.hdrHint, false, "right");
  }

  function drawPanel(x, y, w, h) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.32)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 8;
    roundRect(x, y, w, h, 16, C.panel, null, 0);
    ctx.restore();
  }

  function panelTitle(x, y, title, en) {
    text(title, x + 22, y + 18, 15, C.green, true);
    text(en, x + 22, y + 44, 9, C.dim);
  }

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

  function drawSample(images, state, hoverId, x, y, w, h) {
    panelTitle(x, y, "待识别样本", "S A M P L E");

    // 样本切换按钮
    var btnY = y + 62;
    var btnH = 44;
    var bgap = 8;
    var n = RC.data.samples.length;
    var bw = (w - 44 - bgap * (n - 1)) / n;

    RC.data.samples.forEach(function (s, i) {
      var bx = x + 22 + i * (bw + bgap);
      var on = s.key === state.sample;
      var hot = hoverId === "sample:" + s.key;

      roundRect(bx, btnY, bw, btnH, 8,
                on ? C.green : (hot ? C.btnHover : C.card),
                on ? C.green : C.line, 1);

      text(s.label, bx + bw / 2, btnY + 9, 10.5, on ? C.white : C.ink, true, "center");
      text(String(i + 1), bx + bw / 2, btnY + 28, 8,
           on ? C.subTextOnGreen : C.dim, false, "center");

      hit(bx, btnY, bw, btnH, "sample:" + s.key, function () {
        state.onSample(s.key);
      });
    });

    // 主图区域
    var areaTop = btnY + btnH + 14;
    var chipsTop = y + h - 84;
    var areaH = chipsTop - areaTop - 62;

    drawFit(images, state.sample, x + 40, areaTop, w - 80, areaH - 10, "center");

    // 图片说明
    var hint = "";
    RC.data.samples.forEach(function (s) {
      if (s.key === state.sample) hint = s.hint;
    });
    text(hint, x + 24, chipsTop - 22, 9, C.dim);

    // 特征开关
    var fw = (w - 44 - 16) / 3;
    var vec = RC.data.sampleData[state.sample].vec;

    RC.data.features.forEach(function (name, i) {
      var fx = x + 22 + i * (fw + 8);
      var on = state.enabled[i];
      var hot = hoverId === "feat:" + i;

      roundRect(fx, chipsTop, fw, 58, 9,
                on ? C.featOnBg : (hot ? C.featHover : C.card),
                on ? C.featOnLine : C.line, 1);

      text(name, fx + fw / 2, chipsTop + 9, 13, on ? C.ink : C.dim, true, "center");
      text(on ? vec[i].toFixed(2) : "已关闭",
           fx + fw / 2, chipsTop + 38, 9,
           on ? C.sub : C.dim, false, "center");

      hit(fx, chipsTop, fw, 58, "feat:" + i, function () {
        state.onToggleFeature(i);
      });
    });
  }

  function drawResult(state, x, y, w, h) {
    panelTitle(x, y, "比对结果", "R E S U L T");

    text("最像的是", x + 24, y + 70, 10.5, C.sub);

    if (state.result.winner) {
      var ref = RC.data.refs[state.result.winner];
      var color = state.result.margin > RC.config.thresholds.low ? C.green : C.rust;
      text(ref.name, x + 22, y + 92, 52, color, true);
    } else {
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
    if (!state.result.winner) {
      conf = "没有启用任何特征，机器无从判断";
    } else {
      conf = "相似度 " + Math.round(state.result.pct[state.result.winner]) +
             "%　·　领先 " + Math.round(state.result.margin) + " 个百分点　·　" +
             RC.engine.confidenceText(state.result);
    }
    text(conf, x + 24, y + 190, 9.5, C.sub);

    // 相似度条
    var barsTop = y + 236;
    RC.data.refOrder.forEach(function (key, i) {
      var by = barsTop + i * 74;
      var val = state.shown[key];
      var win = state.result.winner === key;

      text(RC.data.refs[key].name, x + 24, by, 13, win ? C.ink : C.sub, true);
      text(state.result.winner ? Math.round(val) + "%" : "—",
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

    // 底部提示
    line(x + 24, y + h - 92, x + w - 24, y + h - 92, C.line, 1);
    text(RC.engine.note(state.result), x + 24, y + h - 76, 11, C.sub);

    // 结果变化时的高亮
    if (state.flash > 0.02) {
      ctx.save();
      ctx.globalAlpha = state.flash * 0.5;
      roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 16, null, C.green2, 2);
      ctx.restore();
    }
  }

  /* ---------- 对外接口 ---------- */

  return {
    init: function (el) {
      canvas = el;
      ctx = canvas.getContext("2d");
    },

    resize: function () {
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

    toDesign: function (clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      return {
        x: (clientX - r.left - offX) / scale,
        y: (clientY - r.top - offY) / scale
      };
    },

    hitTest: function (px, py) {
      for (var i = hits.length - 1; i >= 0; i--) {
        var h = hits[i];
        if (px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h) {
          return h;
        }
      }
      return null;
    },

    draw: function (state, images, hoverId) {
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
