/* 类型声明（仅供编辑器与 tsc 使用，不会被浏览器加载）
 *
 * 这些类型描述的是 js/ 下各模块共享的数据形状。
 * 运行时行为完全不受影响——本文件不在 index.html 中引用。
 */

/** 三维特征向量：轮廓、颜色、纹理 */
type FeatureVector = number[];

/** 相似度百分比，键为参考库中的植物标识 */
type PctMap = Record<string, number>;

/** 一次比对的结果 */
interface CompareResult {
  /** 各候选的相似度百分比 */
  pct: PctMap;
  /** 最像的候选；没有任何特征被启用时为 null */
  winner: string | null;
  /** 领先第二名多少个百分点 */
  margin: number;
  /** 参与比较的特征数量 */
  featureCount: number;
  /** 本次参与比较的特征向量 */
  vec: FeatureVector;
}

/** 参考库中的一株植物 */
interface RefInfo {
  name: string;
  desc: string;
  vec: FeatureVector;
  img: string;
}

/** 一个图片样本 */
interface SampleData {
  vec: FeatureVector;
  img: string;
}

/** 样本按钮的展示信息 */
interface SampleMeta {
  key: string;
  label: string;
  hint: string;
}

/** 卡片上的一个选项 */
interface FeatureOption {
  key: string;
  label: string;
  value: number;
}

/** 卡片上的一组选项（对应一个特征） */
interface FeatureGroup {
  feature: string;
  options: FeatureOption[];
}

/** 数据层 */
interface RCDataShape {
  features: string[];
  samples: SampleMeta[];
  refOrder: string[];
  refs: Record<string, RefInfo>;
  sampleData: Record<string, SampleData>;
  manualMap: FeatureGroup[];
  manualDefault: string[];
}

/** 配置层 */
interface ConfigShape {
  DW: number;
  DH: number;
  layout: {
    pad: number;
    headerH: number;
    gap: number;
    leftW: number;
    rightW: number;
  };
  colors: Record<string, string>;
  font: string;
  thresholds: {
    high: number;
    low: number;
  };
}

/** 计算层 */
interface EngineModule {
  EPS: number;
  /**
   * 两向量在指定维度上的欧氏距离。
   * 没有任何维度被启用时返回 null。
   */
  distance: (a: FeatureVector, b: FeatureVector, enabled: boolean[]) => number | null;
  /** 对任意特征向量做评估 */
  evaluateVector: (vec: FeatureVector, enabled: boolean[]) => CompareResult;
  /** 对图片样本做评估 */
  evaluate: (sampleKey: string, enabled: boolean[]) => CompareResult;
  /** 把卡片选项转换成特征向量 */
  vectorFromChoices: (choices: string[]) => FeatureVector;
  /** 生成底部提示语 */
  note: (result: CompareResult, manual?: boolean) => string;
  /** 置信度文案 */
  confidenceText: (result: CompareResult) => string;
}

/** 一个可点击区域 */
interface HitArea {
  x: number;
  y: number;
  w: number;
  h: number;
  id: string;
  action: () => void;
}

/** 绘制层 */
interface RenderModule {
  init: (el: HTMLCanvasElement) => void;
  resize: () => void;
  /** 屏幕坐标 → 设计坐标 */
  toDesign: (clientX: number, clientY: number) => { x: number; y: number };
  /** 命中测试 */
  hitTest: (px: number, py: number) => HitArea | null;
  /** 全量重绘 */
  draw: (
    state: AppState,
    images: Record<string, HTMLImageElement | null>,
    hoverId: string | null
  ) => void;
}

/** 应用状态 */
interface AppState {
  /** false = 图片样本模式；true = 照卡片填 */
  manual: boolean;
  /** 当前图片样本的 key */
  sample: string;
  /** 三个特征是否参与比较 */
  enabled: boolean[];
  /** 手动模式下三个特征的选项 key */
  choices: string[];
  /** 最近一次比对结果 */
  result: CompareResult;
  /** 动画中用于显示的百分比 */
  shown: { jia: number; yi: number };
  /** 结果变化时的高亮强度，0–1 */
  flash: number;

  onSample: (key: string) => void;
  onManual: () => void;
  onChoice: (groupIndex: number, key: string) => void;
  onToggleFeature: (idx: number) => void;
  onReset: () => void;
}

/** 全局命名空间 */
interface RCNamespace {
  config: ConfigShape;
  data: RCDataShape;
  engine: EngineModule;
  render: RenderModule;
}

/**
 * 全局命名空间。
 * 运行时的实际对象由最先加载的脚本创建在 window.RC 上，
 * 这里只是声明它的形状，供类型检查使用。
 */
declare const RC: RCNamespace;

interface Window {
  RC?: RCNamespace;
  webkitRequestFullscreen?: () => void;
}

interface Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
}

interface HTMLElement {
  webkitRequestFullscreen?: () => void;
}
