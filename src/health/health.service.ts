export function getHealth() {
    return { ok: true, service: "arcana-api", ts: new Date().toISOString() };
}
