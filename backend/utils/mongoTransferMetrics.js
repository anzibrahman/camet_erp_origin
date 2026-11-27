import { AsyncLocalStorage } from "node:async_hooks";
import { BSON } from "mongodb";

const contextStorage = new AsyncLocalStorage();
const pendingCommands = new Map();
const dailyRoutes = new Map();
let requestSequence = 0;
let activeDay = dayKey();
let lastEmittedDay = null;

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isEnabled() {
  // dotenv is initialized by server.js after ESM imports are evaluated.
  // Read at use time so an enabled production setting is not captured as false.
  return process.env.MONGO_TRANSFER_METRICS_ENABLED === "true";
}

function configuredReportHourUtc() {
  const hour = Number(process.env.MONGO_TRANSFER_METRICS_REPORT_HOUR_UTC ?? 0);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 0;
}

function configuredReportIntervalMs() {
  const interval = Number(process.env.MONGO_TRANSFER_METRICS_REPORT_INTERVAL_MS);
  // Opt-in local/testing reporter. Keep it bounded to avoid accidental log storms.
  return Number.isInteger(interval) && interval >= 60_000 ? interval : null;
}

function routeKey(context) {
  return context?.routeTemplate || "background";
}

function resolveRouteTemplate(req) {
  return req?.route?.path
    ? `${req.baseUrl || ""}${req.route.path}`
    : req
      ? `${req.baseUrl || ""}/unmatched`
      : "background";
}

function newRouteMetrics() {
  return {
    requestCount: 0,
    dbOperationCount: 0,
    estimatedMongoResultBytes: 0,
  };
}

function rotateDayIfNeeded() {
  const today = dayKey();
  if (today === activeDay) return;

  if (lastEmittedDay !== activeDay) emitDailyRanking(activeDay);
  dailyRoutes.clear();
  activeDay = today;
}

function metricsFor(context) {
  rotateDayIfNeeded();
  const key = routeKey(context);
  if (!dailyRoutes.has(key)) dailyRoutes.set(key, newRouteMetrics());
  return dailyRoutes.get(key);
}

function commandKey(event) {
  return `${event.connectionId}:${event.requestId}`;
}

function estimateReplyBytes(reply) {
  // This measures the decoded MongoDB command reply, including all received
  // cursor batches. It is an estimate of result bytes, not Atlas billing bytes.
  try {
    return BSON.calculateObjectSize(reply ?? {});
  } catch {
    return 0;
  }
}

function isMeasuredRead(commandName) {
  return ["find", "aggregate", "getMore", "count", "distinct"].includes(commandName);
}

export function mongoTransferMetricsMiddleware(req, res, next) {
  if (!isEnabled()) return next();

  const context = {
    requestId: ++requestSequence,
    req,
    isHttpRequest: true,
  };

  res.once("finish", () => {
    // Express assigns req.route only after the matched route handler begins.
    // Recording here keeps aggregation under the route template rather than URL IDs.
    metricsFor({ routeTemplate: resolveRouteTemplate(req) }).requestCount += 1;
  });

  contextStorage.run(context, next);
}

export function installMongoTransferMetrics(mongoClient) {
  if (!isEnabled()) return;

  mongoClient.on("commandStarted", (event) => {
    if (!isMeasuredRead(event.commandName)) return;

    const requestContext = contextStorage.getStore();
    const context = requestContext
      ? {
          routeTemplate: resolveRouteTemplate(requestContext.req),
          isHttpRequest: true,
        }
      : {
      routeTemplate: "background",
      isHttpRequest: false,
      };
    metricsFor(context).dbOperationCount += 1;
    pendingCommands.set(commandKey(event), context);
  });

  mongoClient.on("commandSucceeded", (event) => {
    const context = pendingCommands.get(commandKey(event));
    if (!context) return;
    pendingCommands.delete(commandKey(event));

    const metrics = metricsFor(context);
    metrics.estimatedMongoResultBytes += estimateReplyBytes(event.reply);
  });

  mongoClient.on("commandFailed", (event) => {
    pendingCommands.delete(commandKey(event));
  });
}

export function emitDailyRanking(day = activeDay) {
  if (!isEnabled()) return [];

  const ranking = [...dailyRoutes.entries()]
    .map(([route, metrics]) => ({
      route,
      requestCount: metrics.requestCount,
      dbOperationCount: metrics.dbOperationCount,
      totalEstimatedMongoResultBytes: metrics.estimatedMongoResultBytes,
      averageEstimatedMongoResultBytes: metrics.requestCount
        ? Math.round(metrics.estimatedMongoResultBytes / metrics.requestCount)
        : 0,
    }))
    .sort(
      (left, right) =>
        right.totalEstimatedMongoResultBytes - left.totalEstimatedMongoResultBytes,
    );

  console.info(
    JSON.stringify({
      event: "mongo_transfer_daily_ranking",
      day,
      unit: "estimated decoded MongoDB command-reply BSON bytes; not exact Atlas-billed wire bytes",
      routes: ranking,
    }),
  );
  lastEmittedDay = day;
  return ranking;
}

export function startMongoTransferMetricsReporter() {
  if (!isEnabled()) return;

  const intervalMs = configuredReportIntervalMs();
  if (intervalMs) {
    const intervalTimer = setInterval(() => emitDailyRanking(), intervalMs);
    intervalTimer.unref();
    console.info(
      `MongoDB transfer metrics enabled; reporting every ${intervalMs} ms.`,
    );
    return;
  }

  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(configuredReportHourUtc(), 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);

  const firstDelay = next.getTime() - now.getTime();
  const firstTimer = setTimeout(() => {
    emitDailyRanking();
    const dailyTimer = setInterval(() => emitDailyRanking(), 24 * 60 * 60 * 1000);
    dailyTimer.unref();
  }, firstDelay);
  firstTimer.unref();
}
