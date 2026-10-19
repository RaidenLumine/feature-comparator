/* 计算层：特征距离与相似度
 * 只做纯计算，不碰 DOM，也不依赖绘制。
 *
 * 算法说明
 *   1. 只比较被启用的特征（enabled 为 true 的维度）
 *   2. 欧氏距离：d = sqrt(Σ (样本[i] - 参考[i])²)
 *   3. 相似度：s = 1 / (d + eps)，再归一化为百分比
 *      eps 用于避免 d=0 时除零，同时抑制过度自信
 */
window.RC = window.RC || {};

RC.engine = {
  EPS: 0.06,

  /* 返回两向量在指定维度上的欧氏距离；没有任何维度被启用时返回 null */
  distance: function (a, b, enabled) {
    var sum = 0, used = 0;
    for (var i = 0; i < a.length; i++) {
      if (!enabled[i]) continue;
      var d = a[i] - b[i];
      sum += d * d;
      used++;
    }
    return used ? Math.sqrt(sum) : null;
  },

  /* 评估一个样本，返回 { pct, winner, margin, featureCount } */
  evaluate: function (sampleKey, enabled) {
    var data = RC.data;
    var sampleVec = data.sampleData[sampleKey].vec;

    var dist = {};
    data.refOrder.forEach(function (key) {
      dist[key] = RC.engine.distance(sampleVec, data.refs[key].vec, enabled);
    });

    var featureCount = enabled.filter(Boolean).length;

    // 没有任何可用特征
    if (dist[data.refOrder[0]] === null) {
      var zero = {};
      data.refOrder.forEach(function (k) { zero[k] = 0; });
      return { pct: zero, winner: null, margin: 0, featureCount: 0 };
    }

    var sims = {}, total = 0;
    data.refOrder.forEach(function (k) {
      sims[k] = 1 / (dist[k] + RC.engine.EPS);
      total += sims[k];
    });

    var pct = {};
    data.refOrder.forEach(function (k) { pct[k] = sims[k] / total * 100; });

    var winner = pct.jia >= pct.yi ? "jia" : "yi";
    var margin = Math.abs(pct.jia - pct.yi);

    return { pct: pct, winner: winner, margin: margin, featureCount: featureCount };
  },

  /* 根据结果生成一句提示语 */
  note: function (result) {
    var th = RC.config.thresholds;
    if (result.featureCount === 0) {
      return "一个特征都没开，机器没有任何依据。";
    }
    if (result.featureCount === 3) {
      return result.margin > th.high
        ? "三个特征一起看，结论明确。"
        : "即使三个特征都开，这张照片的把握也不高。";
    }
    if (result.margin <= th.low) {
      return "关掉部分特征后，两者几乎一样——这时机器只能猜。";
    }
    return "特征开得少，结论就更容易被单一因素带偏。";
  },

  /* 置信度文案 */
  confidenceText: function (result) {
    var th = RC.config.thresholds;
    if (result.margin > th.high) return "把握较高";
    if (result.margin > th.low) return "把握一般";
    return "几乎分不出来";
  }
};
