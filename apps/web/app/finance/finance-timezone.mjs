const BUSINESS_TIME_ZONE = "Europe/Berlin";
const dateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const localFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function partsAt(instant) {
  const parts = Object.fromEntries(localFormatter.formatToParts(new Date(instant))
    .filter(({ type }) => type !== "literal")
    .map(({ type, value }) => [type, Number(value)]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute };
}
function sameLocalDateTime(left, right) {
  return left.year === right.year && left.month === right.month && left.day === right.day
    && left.hour === right.hour && left.minute === right.minute;
}
function offsetAt(instant) {
  const local = partsAt(instant);
  return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) - instant;
}

export function localDateTimeToBusinessInstant(value) {
  const match = dateTimePattern.exec(value);
  if (!match) throw new TypeError("请填写有效的汇率生效时间。");
  const target = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4]), minute: Number(match[5]) };
  const wallClockAsUtc = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute);
  const normalized = new Date(wallClockAsUtc);
  if (normalized.getUTCFullYear() !== target.year || normalized.getUTCMonth() + 1 !== target.month
      || normalized.getUTCDate() !== target.day || normalized.getUTCHours() !== target.hour
      || normalized.getUTCMinutes() !== target.minute) {
    throw new TypeError("请填写有效的汇率生效时间。");
  }

  const offsets = new Set([
    offsetAt(wallClockAsUtc - 36 * 60 * 60 * 1000),
    offsetAt(wallClockAsUtc),
    offsetAt(wallClockAsUtc + 36 * 60 * 60 * 1000),
  ]);
  const candidates = [...offsets].map((offset) => wallClockAsUtc - offset)
    .filter((instant) => sameLocalDateTime(partsAt(instant), target));
  if (candidates.length === 0) throw new TypeError("该时间在 Europe/Berlin 夏令时切换时不存在，请选择其他时间。");
  if (candidates.length > 1) throw new TypeError("该时间在 Europe/Berlin 夏令时切换时有歧义，请选择其他时间。");
  return new Date(candidates[0]).toISOString();
}
