type DatabaseUrlInfo = {
  effectiveUrl?: string;
  hasDatabaseUrl: boolean;
  isManagedPostgres: boolean;
  isVercelRuntime: boolean;
  connectionLimit: number | null;
  poolTimeout: number | null;
  connectTimeout: number | null;
  sslMode: string | null;
};

function hasParam(url: string, name: string): boolean {
  const re = new RegExp(`(?:\\?|&)${name}=`, "i");
  return re.test(url);
}

function readNumericEnv(name: string): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}

export function buildDatabaseUrlInfo(): DatabaseUrlInfo {
  const baseUrl = process.env.DATABASE_URL?.trim();
  if (!baseUrl) {
    return {
      hasDatabaseUrl: false,
      effectiveUrl: undefined,
      isManagedPostgres: false,
      isVercelRuntime: !!process.env.VERCEL,
      connectionLimit: null,
      poolTimeout: null,
      connectTimeout: null,
      sslMode: null,
    };
  }

  const isManagedPostgres =
    baseUrl.includes("seenode") || baseUrl.includes("run-on-seenode") || baseUrl.includes("neon.tech");
  const isVercelRuntime = !!process.env.VERCEL;
  const extraParams: string[] = [];

  const configuredLimit = readNumericEnv("PRISMA_CONNECTION_LIMIT");
  const defaultLimit = isManagedPostgres ? (isVercelRuntime ? 1 : 2) : isVercelRuntime ? 5 : 10;
  const connectionLimit = configuredLimit ?? defaultLimit;

  const configuredPoolTimeout = readNumericEnv("PRISMA_POOL_TIMEOUT");
  const defaultPoolTimeout = isManagedPostgres ? 20 : 10;
  const poolTimeout = configuredPoolTimeout ?? defaultPoolTimeout;

  const configuredConnectTimeout = readNumericEnv("PRISMA_CONNECT_TIMEOUT");
  const defaultConnectTimeout = isManagedPostgres ? 15 : 10;
  const connectTimeout = configuredConnectTimeout ?? defaultConnectTimeout;

  if (isManagedPostgres && !hasParam(baseUrl, "sslmode")) {
    extraParams.push("sslmode=require");
  }
  if (!hasParam(baseUrl, "connection_limit")) {
    extraParams.push(`connection_limit=${connectionLimit}`);
  }
  if (!hasParam(baseUrl, "pool_timeout")) {
    extraParams.push(`pool_timeout=${poolTimeout}`);
  }
  if (!hasParam(baseUrl, "connect_timeout")) {
    extraParams.push(`connect_timeout=${connectTimeout}`);
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  const effectiveUrl = extraParams.length > 0 ? `${baseUrl}${separator}${extraParams.join("&")}` : baseUrl;

  return {
    hasDatabaseUrl: true,
    effectiveUrl,
    isManagedPostgres,
    isVercelRuntime,
    connectionLimit,
    poolTimeout,
    connectTimeout,
    sslMode: isManagedPostgres ? "require" : null,
  };
}

export function redactDatabaseUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    const db = parsed.pathname.replace(/^\//, "");
    return `${parsed.protocol}//***:***@${host}/${db}`;
  } catch {
    return "invalid-url";
  }
}
