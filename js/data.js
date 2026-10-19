/* 数据层：特征向量与素材说明
 * 数值由真实叶片照片计算得出，改动请同步 README 中的算法说明。
 */
window.RC = window.RC || {};

RC.data = {
  features: ["轮廓", "颜色", "纹理"],

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
  }
};
