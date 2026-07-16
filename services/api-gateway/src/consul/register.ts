export async function registerWithConsul(opts: {
  name: string;
  port: number;
  healthPath?: string;
}) {
  const consulHost = process.env.CONSUL_HTTP_ADDR || process.env.CONSUL_HOST;
  if (!consulHost) {
    console.log('[Consul] CONSUL_HOST not set — skipping service registration');
    return;
  }

  const base = consulHost.startsWith('http') ? consulHost : `http://${consulHost}:8500`;
  const address = process.env.SERVICE_ADDRESS || opts.name;
  const id = `${opts.name}-${address}-${opts.port}`;

  try {
    const res = await fetch(`${base}/v1/agent/service/register`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ID: id,
        Name: opts.name,
        Address: address,
        Port: opts.port,
        Check: {
          HTTP: `http://${address}:${opts.port}${opts.healthPath || '/health'}`,
          Interval: '10s',
          Timeout: '3s',
          DeregisterCriticalServiceAfter: '1m',
        },
      }),
    });
    if (!res.ok) {
      console.warn(`[Consul] register failed: ${res.status}`);
      return;
    }
    console.log(`[Consul] Registered ${opts.name} as ${id}`);

    const deregister = async () => {
      try {
        await fetch(`${base}/v1/agent/service/deregister/${id}`, { method: 'PUT' });
      } catch {
        // ignore
      }
    };
    process.on('SIGTERM', deregister);
    process.on('SIGINT', deregister);
  } catch (err) {
    console.warn(`[Consul] unavailable: ${(err as Error).message}`);
  }
}

export async function resolveServiceUrl(
  serviceName: string,
  fallbackUrl: string,
): Promise<string> {
  const consulHost = process.env.CONSUL_HTTP_ADDR || process.env.CONSUL_HOST;
  if (!consulHost) return fallbackUrl;

  const base = consulHost.startsWith('http') ? consulHost : `http://${consulHost}:8500`;
  try {
    const res = await fetch(`${base}/v1/health/service/${serviceName}?passing=true`);
    if (!res.ok) return fallbackUrl;
    const data = (await res.json()) as Array<{
      Service: { Address: string; Port: number };
    }>;
    if (!data.length) return fallbackUrl;
    const svc = data[0].Service;
    const host = svc.Address || serviceName;
    return `http://${host}:${svc.Port}`;
  } catch {
    return fallbackUrl;
  }
}
