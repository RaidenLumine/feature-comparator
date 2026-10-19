// @ts-check
/* 计算层：特征距离与相似度
 * 只做纯计算，不碰 DOM，也不依赖绘制。
 *
 * 算法说明
 *   1. 只比较被启用的特征（enabled 为 true 的维度）
 *   2. 欧氏距离：d = sqrt(Σ (样本[i] - 参考[i])²)
 *   3. 相似度：s = 1 / (d + eps)，再归一化为百分比
 *      eps 用于避免 d=0 时除零，同时抑制过度自信
 */

window.RC = window.RC || /** @type {any} */ ({});

/** @type {EngineModule} */
RC.engine = {
  EPS: 0.06,

  /**
   * 两向量在指定维度上的欧氏距离。
   * 没有任何维度被启用时返回 null。
   * @param {FeatureVector} a
   * @param {FeatureVector} b
   * @param {boolean[]} enabled
   * @returns {number | null}
   */
  distance: function (a, b, enabled) {
    var sum = 0;
    var used = 0;
    for (var i = 0; i < a.length; i++) {
      if (!enabled[i]) continue;
      var d = a[i] - b[i];
      sum += d * d;
      used++;
    }
    return used ? Math.sqrt(sum) : null;
  },

  /**
   * 核心：对一个任意特征向量做评估
   * @param {FeatureVector} vec
   * @param {boolean[]} enabled
   * @returns {CompareResult}
   */
  evaluateVector: function (vec, enabled) {
    var data = RC.data;

    /** @type {Record<string, number | null>} */
    var dist = {};
    data.refOrder.forEach(function (key) {
      dist[key] = RC.engine.distance(vec, data.refs[key].vec, enabled);
    });

    var featureCount = enabled.filter(Boolean).length;

    // 没有任何可用特征
    var firstKey = data.refOrder[0];
    if (dist[firstKey] === null) {
      /** @type {PctMap} */
      var zero = {};
      data.refOrder.forEach(function (k) { zero[k] = 0; });
      return { pct: zero, winner: null, margin: 0, featureCount: 0, vec: vec.slice() };
    }

    /** @type {Record<string, number>} */
    var sims = {};
    var total = 0;
    data.refOrder.forEach(function (k) {
      var d = dist[k];
      // d 已排除 null 情况：上面已确保首个候选非 null，
      // 但其余候选可能因维度问题为 null，这里做一次兜底。
      var value = (d === null) ? 0 : 1 / (d + RC.engine.EPS);
      sims[k] = value;
      total += value;
    });

    /** @type {PctMap} */
    var pct = {};
    data.refOrder.forEach(function (k) {
      pct[k] = total ? sims[k] / total * 100 : 0;
    });

    var winner = pct.jia >= pct.yi ? "jia" : "yi";
    var margin = Math.abs(pct.jia - pct.yi);

    return {
      pct: pct,
      winner: winner,
      margin: margin,
      featureCount: featureCount,
      vec: vec.slice()
    };
  },

  /**
   * 对图片样本做评估
   * @param {string} sampleKey
   * @param {boolean[]} enabled
   * @returns {CompareResult}
   */
  evaluate: function (sampleKey, enabled) {
    var vec = RC.data.sampleData[sampleKey].vec;
    return RC.engine.evaluateVector(vec, enabled);
  },

  /**
   * 把卡片选项转换成特征向量
   * @param {string[]} choices
   * @returns {FeatureVector}
   */
  vectorFromChoices: function (choices) {
    return RC.data.manualMap.map(function (group, i) {
      var key = choices[i];
      for (var j = 0; j < group.options.length; j++) {
        if (group.options[j].key === key) return group.options[j].value;
      }
      return group.options[0].value;
    });
  },

  /**
   * 根据结果生成一句提示语
   * @param {CompareResult} result
   * @param {boolean} [manual]
   * @returns {string}
   */
  note: function (result, manual) {
    var th = RC.config.thresholds;

    if (result.featureCount === 0) {
      return "一个特征都没开，机器没有任何依据。";
    }

    if (manual) {
      if (result.margin > th.high) {
        return "照卡片填进去的这三行，机器判得很干脆。";
      }
      if (result.margin > th.low) {
        return "三行都填了，但把握一般——说明这几个特征区分度不高。";
      }
      return "特征填得越接近，机器就越说不清——它只能给出「最像」。";
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

  /**
   * 置信度文案
   * @param {CompareResult} result
   * @returns {string}
   */
  confidenceText: function (result) {
    var th = RC.config.thresholds;
    if (result.margin > th.high) return "把握较高";
    if (result.margin > th.low) return "把握一般";
    return "几乎分不出来";
  }
};
