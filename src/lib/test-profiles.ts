import type { Prisma } from "@prisma/client";

export const testProfileIncludeItems = {
  items: {
    orderBy: { order: "asc" as const },
    include: { labTest: { include: { section: true } } },
  },
} as const;

type TestProfileWithItems = Prisma.TestProfileGetPayload<{ include: typeof testProfileIncludeItems }>;

export function mapTestProfile(profile: TestProfileWithItems) {
  return {
    id: profile.id,
    name: profile.name,
    packagePrice: profile.packagePrice != null ? Number(profile.packagePrice) : null,
    tests: profile.items.map((item) => ({
      id: item.labTest.id,
      code: item.labTest.code,
      name: item.labTest.name,
      section: item.labTest.section?.code ?? "",
      price: Number(item.labTest.price),
    })),
  };
}
