export type TechnicalSpecValue = string | number | boolean | null | string[];
export type TechnicalSpecs = Record<string, Record<string, TechnicalSpecValue>>;

export type TechnicalSpecField = {
  code: string;
  label: string;
  type?: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
  placeholder?: string;
};

export type TechnicalSpecModule = {
  code: string;
  title: string;
  summaryFields: string[];
  fields: TechnicalSpecField[];
};

const text = (code: string, label: string, placeholder?: string): TechnicalSpecField => placeholder === undefined ? ({ code, label }) : ({ code, label, placeholder });
const number = (code: string, label: string, placeholder?: string): TechnicalSpecField => placeholder === undefined ? ({ code, label, type: 'number' }) : ({ code, label, type: 'number', placeholder });
const select = (code: string, label: string, options: string[]): TechnicalSpecField => ({ code, label, type: 'select', options });
const boolean = (code: string, label: string): TechnicalSpecField => ({ code, label, type: 'boolean' });

export const technicalSpecModules: TechnicalSpecModule[] = [
  { code: 'basic', title: '型号基本信息', summaryFields: ['productType', 'structureType', 'markets'], fields: [
    text('series', '产品系列'), select('productType', '产品类型', ['折叠电助力自行车', '普通自行车', '电助力自行车', '其他']), text('designVersion', '产品代次 / 设计版本'), text('structureType', '车辆结构类型'), boolean('foldable', '是否折叠'), boolean('electricAssist', '是否电助力'), text('markets', '目标销售市场', '例如 DE、AT、英国'), text('techOwner', '技术负责人'), text('description', '型号说明'),
  ]},
  { code: 'frame', title: '车架与折叠结构', summaryFields: ['material', 'foldingType', 'maxLoad'], fields: [
    text('material', '车架材料'), text('brand', '车架品牌'), text('supplierModel', '车架供应商型号'), text('partNumber', '内部零件编码'), text('size', '车架尺寸'), text('geometry', '几何尺寸（上管 / 座管 / 头管）'), text('standover', '跨高'), text('foldingType', '折叠机构类型'), text('joint', '折叠关节结构'), text('lock', '折叠锁止机构'), text('foldingSteps', '折叠步骤说明'), text('color', '车架颜色'), text('finish', '表面处理'), number('maxLoad', '最大允许载荷（kg）'), number('weight', '车架重量（kg）'), text('drawing', '车架图纸及版本'), text('notes', '车架备注'),
  ]},
  { code: 'suspension', title: '前叉与避震系统', summaryFields: ['forkType', 'rearType', 'travel'], fields: [
    text('forkType', '前叉类型'), text('forkMaterial', '前叉材料'), text('forkBrand', '前叉品牌'), text('forkModel', '前叉型号'), number('forkTravel', '前叉行程（mm）'), text('frontStructure', '前避震结构'), text('rearType', '后避震类型'), text('rearBrand', '后避震品牌'), text('rearModel', '后避震型号'), number('rearTravel', '后避震行程（mm）'), text('mountSize', '后避震安装尺寸'), boolean('adjustable', '是否可调节'), text('tuning', '避震参数及调校说明'), text('partNumber', '关联零件编码'), text('drawing', '技术图纸'), text('notes', '备注'),
  ]},
  { code: 'wheels', title: '轮组与轮胎', summaryFields: ['wheelSize', 'tireSize', 'tireBrand'], fields: [
    text('front', '前轮配置（品牌 / 花鼓 / 轴 / 辐条）'), text('rear', '后轮配置（品牌 / 花鼓 / 轴 / 辐条）'), text('wheelSize', '轮径', '例如 20 英寸'), text('rimMaterial', '轮圈材料 / 内宽'), text('tireBrand', '轮胎品牌、型号'), text('tireSize', '轮胎尺寸', '例如 20 × 1.75 英寸'), text('tireWidth', '轮胎宽度'), number('maxPressure', '最大允许胎压'), text('tubeType', '内胎或无内胎结构'), text('puncture', '防刺性能'), text('recommendedPressure', '推荐胎压'), boolean('sameFrontRear', '前后轮是否相同规格'), text('partNumber', '关联零件编码'), text('notes', '备注'),
  ]},
  { code: 'drivetrain', title: '传动系统', summaryFields: ['type', 'gears', 'brand'], fields: [
    select('type', '传动类型', ['链条', '皮带']), text('brand', '传动品牌'), text('derailleur', '变速系统品牌、型号'), number('gears', '变速档位数量'), text('shifter', '指拨型号'), text('frontDerailleur', '前拨型号'), text('rearDerailleur', '后拨型号'), text('cassette', '飞轮 / 卡式飞轮规格'), text('chainring', '牙盘规格'), number('crankLength', '曲柄长度（mm）'), text('chainOrBelt', '链条型号或皮带规格'), text('ratio', '传动比范围'), select('speedType', '单速或多速', ['单速', '多速']), text('pedal', '脚踏型号'), text('partNumber', '关联零件编码'), text('notes', '备注'),
  ]},
  { code: 'brakes', title: '制动系统', summaryFields: ['type', 'form', 'front'], fields: [
    select('type', '制动类型', ['碟刹', '轮圈刹', '其他']), select('form', '制动形式', ['液压', '机械']), text('front', '前刹车品牌、型号'), text('rear', '后刹车品牌、型号'), text('caliper', '卡钳型号'), text('lever', '刹车手柄型号'), number('frontRotor', '前刹车盘直径（mm）'), number('rearRotor', '后刹车盘直径（mm）'), text('cutoff', '刹车断电传感器'), number('weight', '制动系统重量（kg）'), text('partNumber', '关联零件编码'), text('notes', '备注'),
  ]},
  { code: 'motor', title: '电机系统', summaryFields: ['type', 'ratedPower', 'torque'], fields: [
    text('type', '电机类型'), text('position', '安装位置'), text('brand', '电机品牌'), text('model', '电机型号'), number('ratedPower', '额定功率（W）'), number('peakPower', '峰值功率（W）'), number('torque', '额定扭矩（Nm）'), text('voltage', '额定电压'), text('sensor', '传感器类型'), text('assistMode', '助力模式'), text('speedLimit', '助力速度限制'), text('waterproof', '防护等级'), text('partNumber', '关联零件编码'), text('notes', '备注'),
  ]},
  { code: 'battery', title: '电池与充电系统', summaryFields: ['capacity', 'voltage', 'charger'], fields: [
    text('type', '电池类型'), text('brand', '电池品牌'), text('model', '电池型号'), text('chemistry', '电芯体系'), text('voltage', '额定电压'), number('capacity', '容量（Wh / Ah）'), number('range', '标称续航（km）'), text('mount', '安装位置'), text('removable', '是否可拆卸'), text('charger', '充电器型号'), text('chargeTime', '充电时间'), text('chargePort', '充电接口'), text('safety', '安全与运输文件'), text('partNumber', '关联零件编码'), text('notes', '备注'),
  ]},
  { code: 'electrical', title: '控制器、显示与电气', summaryFields: ['controller', 'display', 'wiring'], fields: [
    text('controller', '控制器品牌 / 型号'), text('display', '显示器品牌 / 型号'), text('displayFunctions', '显示功能'), text('wiring', '线束与接口'), text('firmware', '固件版本'), text('lights', '前后灯规格'), text('horn', '喇叭 / 其他电气件'), text('waterproof', '防水等级'), text('diagnostics', '诊断与故障代码'), text('partNumber', '关联零件编码'), text('notes', '备注'),
  ]},
  { code: 'contact', title: '接触件与操控件', summaryFields: ['handlebar', 'saddle', 'grips'], fields: [
    text('handlebar', '车把型号 / 材料'), text('stem', '把立型号 / 长度'), text('grips', '把套型号'), text('saddle', '座垫型号'), text('seatpost', '座管型号 / 行程'), text('seatClamp', '座管夹型号'), text('kickstand', '脚撑型号'), text('pedal', '脚踏型号'), text('bell', '铃 / 反光件'), text('partNumber', '关联零件编码'), text('notes', '备注'),
  ]},
  { code: 'dimensions', title: '尺寸与性能', summaryFields: ['length', 'weight', 'payload'], fields: [
    number('length', '整车长度（mm）'), number('width', '整车宽度（mm）'), number('height', '整车高度（mm）'), number('foldedLength', '折叠后长度（mm）'), number('foldedWidth', '折叠后宽度（mm）'), number('foldedHeight', '折叠后高度（mm）'), number('weight', '整车重量（kg）'), number('payload', '最大承重（kg）'), text('rangeConditions', '续航测试条件'), text('performance', '性能备注'),
  ]},
  { code: 'appearance', title: '外观与颜色', summaryFields: ['primaryColor', 'finish'], fields: [
    text('primaryColor', '主色名称'), text('colorCode', '颜色色号'), text('finish', '表面工艺'), text('secondaryColors', '可选颜色'), text('logo', 'Logo / 标识位置'), text('decals', '贴花与警示标识'), text('sample', '色板 / 样件编号'), text('notes', '备注'),
  ]},
  { code: 'accessories', title: '标准与选配附件', summaryFields: ['standard', 'optional'], fields: [
    text('standard', '标准附件'), text('optional', '可选附件'), text('rack', '货架 / 挡泥板'), text('basket', '车篮'), text('lock', '车锁'), text('charger', '随车充电器'), text('tools', '随车工具'), text('manual', '说明书 / 保修卡'), text('notes', '备注'),
  ]},
  { code: 'market', title: '市场与认证', summaryFields: ['markets', 'certifications', 'status'], fields: [
    text('markets', '目标市场'), text('certifications', '认证范围 / 证书编号'), text('regulatory', '法规与标签要求'), text('language', '随车语言'), text('marketVariant', '市场差异配置'), text('status', '合规状态'), text('evidence', '证据文件 / 复核记录'), text('notes', '备注'),
  ]},
  { code: 'packaging', title: '包装与物流', summaryFields: ['carton', 'grossWeight'], fields: [
    text('carton', '外箱尺寸（长 × 宽 × 高）'), number('grossWeight', '毛重（kg）'), number('netWeight', '净重（kg）'), text('foldedPacking', '折叠装箱方式'), text('protection', '缓冲与保护材料'), text('pallet', '托盘 / 堆码要求'), text('shippingMark', '唛头'), text('dangerousGoods', '电池运输分类'), text('notes', '备注'),
  ]},
  { code: 'documents', title: '技术资料与质量', summaryFields: ['drawing', 'inspection'], fields: [
    text('drawing', '总图 / 技术图纸版本'), text('specRevision', '规格书版本'), text('inspection', '检验标准 / 关键尺寸'), text('qcPlan', 'QC 计划'), text('testReport', '测试报告'), text('changeLog', '工程变更记录'), text('qualityOwner', '质量负责人'), text('documentLinks', '对象库文件引用'), text('notes', '备注'),
  ]},
  { code: 'bomMapping', title: '零件与 BOM 映射', summaryFields: ['bomRevisionId', 'partIds'], fields: [
    text('bomRevisionId', '关联 BOM Revision'), text('partIds', '关键零件引用'), text('variantRule', 'Variant 继承规则'), text('skuOverrideRule', 'SKU 覆盖规则'), text('notes', '映射备注'),
  ]},
];

export function emptyTechnicalSpecs(): TechnicalSpecs {
  return Object.fromEntries(technicalSpecModules.map(module => [module.code, {}]));
}

export function technicalSpecProgress(specs: TechnicalSpecs, module: TechnicalSpecModule) {
  const values = specs[module.code] ?? {};
  const filled = module.fields.filter(field => {
    const value = values[field.code];
    return value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);
  }).length;
  return { filled, total: module.fields.length };
}

export function technicalSpecValue(specs: TechnicalSpecs, moduleCode: string, fieldCode: string) {
  const value = specs[moduleCode]?.[fieldCode];
  return value === undefined || value === null ? '' : Array.isArray(value) ? value.join(', ') : String(value);
}
