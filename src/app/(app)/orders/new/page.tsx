import { prisma } from "@/lib/prisma";
import { OrderForm } from "@/components/forms/OrderForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewOrderPage() {
  const [patients, tests] = await Promise.all([
    prisma.patient.findMany({
      where: { deletedAt: null },
      orderBy: { lastName: "asc" },
    }),
    prisma.labTest.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva orden</CardTitle>
      </CardHeader>
      <CardContent>
        <OrderForm
          patients={patients.map((patient) => ({
            id: patient.id,
            label: `${patient.lastName} ${patient.firstName} (${patient.dni})`,
          }))}
          tests={tests.map((test) => ({
            id: test.id,
            label: `${test.code} - ${test.name}`,
            price: Number(test.price),
          }))}
        />
      </CardContent>
    </Card>
  );
}
