import { prisma } from "./prisma";

export type PrintConfig = {
  stampEnabled: boolean;
  stampImageUrl: string | null;
};

const KEYS = {
  STAMP_ENABLED: "print_stamp_enabled",
  STAMP_IMAGE_URL: "print_stamp_image_url",
} as const;

export async function getPrintConfig(): Promise<PrintConfig> {
  // Fallback si el cliente Prisma no tiene aún el modelo AppConfig (ej. tras migración sin generate)
  if (typeof (prisma as { appConfig?: unknown }).appConfig !== "object") {
    return { stampEnabled: false, stampImageUrl: null };
  }
  const [enabled, url] = await Promise.all([
    prisma.appConfig.findUnique({ where: { key: KEYS.STAMP_ENABLED } }),
    prisma.appConfig.findUnique({ where: { key: KEYS.STAMP_IMAGE_URL } }),
  ]);
  return {
    stampEnabled: enabled?.value === "true",
    stampImageUrl: url?.value && url.value !== "" ? url.value : null,
  };
}

export async function updatePrintConfig(data: Partial<PrintConfig>): Promise<PrintConfig> {
  if (typeof data.stampEnabled === "boolean") {
    await prisma.appConfig.upsert({
      where: { key: KEYS.STAMP_ENABLED },
      create: { key: KEYS.STAMP_ENABLED, value: String(data.stampEnabled) },
      update: { value: String(data.stampEnabled) },
    });
  }
  if (data.stampImageUrl !== undefined) {
    const value = data.stampImageUrl?.trim() || "";
    await prisma.appConfig.upsert({
      where: { key: KEYS.STAMP_IMAGE_URL },
      create: { key: KEYS.STAMP_IMAGE_URL, value },
      update: { value },
    });
    if (value === "") {
      await prisma.storedImage.deleteMany({ where: { key: "print_stamp" } }).catch(() => {});
    }
  }
  return getPrintConfig();
}
