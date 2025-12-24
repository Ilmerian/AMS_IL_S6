export function logMetric(event, userId = null) {
    console.log("[METRIC]", {
        event,
        user_id: userId,
        timestamp: new Date().toISOString()
    });
}
