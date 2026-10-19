// @ts-check
/* 数据层：特征向量、卡片选项映射、素材说明
 *
 * 数值由真实叶片照片计算得出，与 assets/ 中的图片一一对应。
 *
 * 卡片映射（manualMap）的取值来源：
 *   光滑 / 深绿 / 疏 —— 取自甲的实测特征值
 *   锯齿 / 浅绿 / 密 —— 取自乙的实测特征值
 * 因此学生按卡片如实填写时，选出的组合会精确等于对应植物，
 * 这正是"把卡片上的话翻译成机器能读的数字"这一步。
 */

window.RC = window.RC || /** @type {any} */ ({});

/** @type {RCDataShape} */
RC.data = {
  features: ["轮廓", "颜色", "纹理"],

  // 图片样本（原有演示模式使用）
  samples: [
    { key: "s1", label: "正常拍摄",   hint: "叶面平整、光线均匀" },
    { key: "s2", label: "逆光照片",   hint: "曝光不足，颜色和纹理都变了" },
    { key: "s3", label: "另一株植物", hint: "叶缘有明显的锯齿" },
    { key: "s4", label: "抖动失焦",   hint: "照片糊了，细节丢失" }
  ],

  refOrder: ["jia", "yi"],

  refs: {
    jia: { name: "甲", desc: "叶缘光滑 · 深绿", vec: [0.438, 0.649, 0.4], img: "assets/ref-jia.png" },
    yi:  { name: "乙", desc: "叶缘有锯齿 · 偏浅", vec: [0.776, 0.718, 0.425], img: "assets/ref-yi.png" }
  },

  sampleData: {
    s1: { vec: [0.438, 0.649, 0.4], img: "assets/sample-s1.png" },
    s2: { vec: [0.438, 0.816, 0.117], img: "assets/sample-s2.png" },
    s3: { vec: [0.776, 0.718, 0.425], img: "assets/sample-s3.png" },
    s4: { vec: [0.747, 0.709, 0.373], img: "assets/sample-s4.png" }
  },

  /* 卡片选项 → 特征数值
   * 每个特征给两个选项，对应卡片上的两个勾选框。
   * value 是该选项被机器"读"成的数字。
   */
  manualMap: [
    {
      feature: "轮廓",
      options: [
        { key: "smooth",   label: "光滑", value: 0.438 },
        { key: "serrated", label: "锯齿", value: 0.776 }
      ]
    },
    {
      feature: "颜色",
      options: [
        { key: "dark",  label: "深绿", value: 0.649 },
        { key: "light", label: "浅绿", value: 0.718 }
      ]
    },
    {
      feature: "纹理",
      options: [
        { key: "sparse", label: "疏", value: 0.400 },
        { key: "dense",  label: "密", value: 0.425 }
      ]
    }
  ],

  /* 手动模式的默认选择：对应卡片"最典型"的一张（甲） */
  manualDefault: ["smooth", "dark", "sparse"]
};
