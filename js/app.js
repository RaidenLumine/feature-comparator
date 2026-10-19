/* 应用层：状态管理、图片预加载、事件绑定、动画循环
 * 依赖 config.js / data.js / engine.js / render.js，按此顺序引入。
 */
(function () {
  var render = RC.render;
  var engine = RC.engine;
  var data = RC.data;

  /* ---------- 状态 ---------- */

  var state = {
    sample: "s1",
    enabled: [true, true, true],
    result: null,
    shown: { jia: 0, yi: 0 },   // 动画中的显示值
    flash: 0,                   // 结果变化时的高亮强度

    onSample: function (key) {
      state.sample = key;
      refresh(true);
    },

    onToggleFeature: function (idx) {
      state.enabled[idx] = !state.enabled[idx];
      refresh(true);
    },

    onReset: function () {
      state.sample = "s1";
      state.enabled = [true, true, true];
      state.shown = { jia: 0, yi: 0 };
      refresh(true);
    }
  };

  // 先算一次，保证首帧绘制时有结果可用
  state.result = engine.evaluate(state.sample, state.enabled);
  state.shown.jia = state.result.pct.jia;
  state.shown.yi = state.result.pct.yi;

  var images = {};
  var hoverId = null;
  var animating = false;

  /* ---------- 计算与动画 ---------- */

  function refresh(animate) {
    state.result = engine.evaluate(state.sample, state.enabled);
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
      var d = target - state.shown[k];
      if (Math.abs(d) > 0.25) {
        state.shown[k] += d * 0.35;
        moving = true;
      } else {
        state.shown[k] = target;
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

  function preload(done) {
    var keys = [];
    data.refOrder.forEach(function (k) { keys.push(k); });
    data.samples.forEach(function (s) { keys.push(s.key); });

    var pending = keys.length;
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
        state.onToggleFeature({ q: 0, w: 1, e: 2 }[k]);
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
      var el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }

  /* ---------- 可选的 URL 参数（排练时直达某一幕） ---------- */

  function applyQuery() {
    try {
      var q = {};
      location.search.replace(/^\?/, "").split("&").forEach(function (kv) {
        if (!kv) return;
        var parts = kv.split("=");
        q[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || "");
      });

      if (q.s && data.sampleData[q.s]) state.sample = q.s;
      if (q.f && q.f.length === 3) {
        state.enabled = q.f.split("").map(function (c) { return c === "1"; });
      }
    } catch (err) {
      /* 参数不合法时静默忽略，使用默认状态 */
    }
  }

  /* ---------- 启动 ---------- */

  function boot() {
    var canvas = document.getElementById("stage");
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
