// @ts-check
/* 应用层：状态管理、图片预加载、事件绑定、动画循环
 * 依赖 config.js / data.js / engine.js / render.js，按此顺序引入。
 */
(function () {
  var render = RC.render;
  var engine = RC.engine;
  var data = RC.data;

  /* ---------- 初始值 ---------- */

  /** @type {boolean[]} */
  var initialEnabled = [true, true, true];
  var initialResult = engine.evaluate("s1", initialEnabled);

  /** @type {AppState} */
  var state = {
    manual: false,                          // false = 图片样本；true = 照卡片填
    sample: "s1",
    enabled: initialEnabled,
    choices: data.manualDefault.slice(),    // 手动模式下三个特征的选择
    result: initialResult,
    shown: { jia: initialResult.pct.jia, yi: initialResult.pct.yi },
    flash: 0,                               // 结果变化时的高亮强度

    /** @param {string} key */
    onSample: function (key) {
      state.manual = false;
      state.sample = key;
      refresh(true);
    },

    onManual: function () {
      state.manual = true;
      refresh(true);
    },

    /**
     * @param {number} groupIndex
     * @param {string} key
     */
    onChoice: function (groupIndex, key) {
      state.choices[groupIndex] = key;
      refresh(true);
    },

    /** @param {number} idx */
    onToggleFeature: function (idx) {
      state.enabled[idx] = !state.enabled[idx];
      refresh(true);
    },

    onReset: function () {
      state.manual = false;
      state.sample = "s1";
      state.enabled = [true, true, true];
      state.choices = data.manualDefault.slice();
      state.shown = { jia: 0, yi: 0 };
      refresh(true);
    }
  };

  /** @type {Record<string, HTMLImageElement | null>} */
  var images = {};
  /** @type {string | null} */
  var hoverId = null;
  var animating = false;

  /* ---------- 计算与动画 ---------- */

  /**
   * @returns {CompareResult}
   */
  function computeResult() {
    if (state.manual) {
      var vec = engine.vectorFromChoices(state.choices);
      return engine.evaluateVector(vec, state.enabled);
    }
    return engine.evaluate(state.sample, state.enabled);
  }

  /**
   * @param {boolean} animate
   */
  function refresh(animate) {
    state.result = computeResult();
    state.flash = 1;

    if (animate === false) {
      state.shown.jia = state.result.pct.jia;
      state.shown.yi = state.result.pct.yi;
      render.draw(state, images, hoverId);
    } else {
      startAnimation();
    }
  }

  function startAnimation() {
    if (animating) return;
    animating = true;
    requestAnimationFrame(tick);
  }

  function tick() {
    var moving = false;

    data.refOrder.forEach(function (k) {
      var target = state.result.pct[k];
      var current = k === "jia" ? state.shown.jia : state.shown.yi;
      var d = target - current;
      if (Math.abs(d) > 0.25) {
        if (k === "jia") state.shown.jia = current + d * 0.35;
        else state.shown.yi = current + d * 0.35;
        moving = true;
      } else if (k === "jia") {
        state.shown.jia = target;
      } else {
        state.shown.yi = target;
      }
    });

    if (state.flash > 0.01) {
      state.flash *= 0.88;
      moving = true;
    }

    render.draw(state, images, hoverId);

    if (moving) {
      requestAnimationFrame(tick);
    } else {
      state.flash = 0;
      animating = false;
      render.draw(state, images, hoverId);
    }
  }

  /* ---------- 图片预加载 ---------- */

  /**
   * @param {(failed: string[]) => void} done
   */
  function preload(done) {
    /** @type {string[]} */
    var keys = [];
    data.refOrder.forEach(function (k) { keys.push(k); });
    data.samples.forEach(function (s) { keys.push(s.key); });

    var pending = keys.length;
    /** @type {string[]} */
    var failed = [];

    keys.forEach(function (key) {
      var src = data.refs[key] ? data.refs[key].img : data.sampleData[key].img;
      var img = new Image();
      img.onload = function () {
        images[key] = img;
        if (--pending === 0) done(failed);
      };
      img.onerror = function () {
        images[key] = null;
        failed.push(key);
        if (--pending === 0) done(failed);
      };
      img.src = src;
    });
  }

  /* ---------- 事件 ---------- */

  /**
   * @param {HTMLCanvasElement} canvas
   */
  function bindEvents(canvas) {
    canvas.addEventListener("mousemove", function (e) {
      var p = render.toDesign(e.clientX, e.clientY);
      var h = render.hitTest(p.x, p.y);
      var id = h ? h.id : null;
      if (id !== hoverId) {
        hoverId = id;
        canvas.style.cursor = id ? "pointer" : "default";
        render.draw(state, images, hoverId);
      }
    });

    canvas.addEventListener("click", function (e) {
      var p = render.toDesign(e.clientX, e.clientY);
      var h = render.hitTest(p.x, p.y);
      if (h) h.action();
    });

    canvas.addEventListener("dblclick", toggleFullscreen);

    document.addEventListener("keydown", function (e) {
      var k = (e.key || "").toLowerCase();

      if (e.key >= "1" && e.key <= "4") {
        var s = data.samples[parseInt(e.key, 10) - 1];
        if (s) state.onSample(s.key);
        return;
      }
      if (k === "q" || k === "w" || k === "e") {
        /** @type {Record<string, number>} */
        var map = { q: 0, w: 1, e: 2 };
        state.onToggleFeature(map[k]);
        return;
      }
      if (k === "m") {
        state.onManual();
        return;
      }
      if (k === "r") {
        state.onReset();
        return;
      }
      if (k === "f") {
        toggleFullscreen();
        return;
      }
      if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen();
      }
    });

    window.addEventListener("resize", function () {
      render.resize();
      render.draw(state, images, hoverId);
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      var el = /** @type {HTMLElement} */ (document.documentElement);
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }

  /* ---------- URL 参数（排练时直达某一幕） ----------
   * ?s=s2&f=010                    图片样本 + 特征开关
   * ?m=1&c=serrated,light,dense    手动模式 + 卡片选项
   */

  function applyQuery() {
    try {
      /** @type {Record<string, string>} */
      var q = {};
      location.search.replace(/^\?/, "").split("&").forEach(function (kv) {
        if (!kv) return;
        var parts = kv.split("=");
        q[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || "");
      });

      if (q.s && data.sampleData[q.s]) {
        state.sample = q.s;
        state.manual = false;
      }
      if (q.f && q.f.length === 3) {
        state.enabled = q.f.split("").map(function (c) { return c === "1"; });
      }
      if (q.m === "1") {
        state.manual = true;
      }
      if (q.c) {
        var keys = q.c.split(",");
        if (keys.length === 3) {
          data.manualMap.forEach(function (group, i) {
            var exists = group.options.some(function (o) { return o.key === keys[i]; });
            if (exists) state.choices[i] = keys[i];
          });
        }
      }
    } catch (err) {
      /* 参数不合法时静默忽略，使用默认状态 */
    }
  }

  /* ---------- 启动 ---------- */

  function boot() {
    var el = document.getElementById("stage");
    if (!(el instanceof HTMLCanvasElement)) {
      console.error("找不到 #stage 画布元素");
      return;
    }
    var canvas = el;

    render.init(canvas);
    render.resize();

    // 先画一帧底色，避免图片加载时闪白
    render.draw(state, images, null);

    preload(function (failed) {
      if (failed.length) {
        console.warn("以下图片加载失败：", failed);
      }
      applyQuery();
      refresh(false);
      bindEvents(canvas);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
