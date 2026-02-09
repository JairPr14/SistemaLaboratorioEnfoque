import { PrismaClient, type LabSection, type Sex, type ValueType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const patients = [
    {
      code: "PAC-001",
      dni: "70123456",
      firstName: "María",
      lastName: "Gómez",
      birthDate: new Date("1992-05-12"),
      sex: "F" as Sex,
      phone: "999111222",
      address: "Av. Salud 123",
      email: "maria.gomez@example.com",
    },
    {
      code: "PAC-002",
      dni: "70987654",
      firstName: "Luis",
      lastName: "Ramírez",
      birthDate: new Date("1988-10-22"),
      sex: "M" as Sex,
      phone: "999333444",
      address: "Jr. Hospital 456",
      email: "luis.ramirez@example.com",
    },
  ];

  for (const patient of patients) {
    await prisma.patient.upsert({
      where: { code: patient.code },
      update: patient,
      create: patient,
    });
  }

  const tests = [
    {
      code: "GLU",
      name: "Glucosa",
      section: "BIOQUIMICA" as LabSection,
      price: 15.5,
    },
    {
      code: "HGB",
      name: "Hemoglobina",
      section: "HEMATOLOGIA" as LabSection,
      price: 12.0,
    },
    {
      code: "ORIN",
      name: "Examen de Orina",
      section: "ORINA" as LabSection,
      price: 20.0,
    },
  ];

  for (const test of tests) {
    await prisma.labTest.upsert({
      where: { code: test.code },
      update: test,
      create: test,
    });
  }

  const glucosa = await prisma.labTest.findUnique({ where: { code: "GLU" } });
  const hemoglobina = await prisma.labTest.findUnique({ where: { code: "HGB" } });

  if (glucosa) {
    await prisma.labTemplate.upsert({
      where: { labTestId: glucosa.id },
      update: {
        title: "Glucosa en sangre",
        notes: "Ayuno de 8 horas recomendado.",
      },
      create: {
        labTestId: glucosa.id,
        title: "Glucosa en sangre",
        notes: "Ayuno de 8 horas recomendado.",
        items: {
          createMany: {
            data: [
              {
                paramName: "Glucosa",
                unit: "mg/dL",
                refRangeText: "70 - 110",
                refMin: 70,
                refMax: 110,
                valueType: "NUMBER" as ValueType,
                selectOptions: "[]",
                order: 1,
              },
            ],
          },
        },
      },
    });
  }

  if (hemoglobina) {
    await prisma.labTemplate.upsert({
      where: { labTestId: hemoglobina.id },
      update: {
        title: "Hemoglobina",
        notes: "Muestra de sangre total.",
      },
      create: {
        labTestId: hemoglobina.id,
        title: "Hemoglobina",
        notes: "Muestra de sangre total.",
        items: {
          createMany: {
            data: [
              {
                paramName: "Hemoglobina",
                unit: "g/dL",
                refRangeText: "12 - 16",
                refMin: 12,
                refMax: 16,
                valueType: "NUMBER" as ValueType,
                selectOptions: "[]",
                order: 1,
              },
            ],
          },
        },
      },
    });
  }

  const firstPatient = await prisma.patient.findUnique({
    where: { code: "PAC-001" },
  });

  if (firstPatient && glucosa && hemoglobina) {
    const order = await prisma.labOrder.create({
      data: {
        orderCode: "ORD-DEMO-0001",
        patientId: firstPatient.id,
        status: "EN_PROCESO",
        totalPrice: Number(glucosa.price) + Number(hemoglobina.price),
        items: {
          createMany: {
            data: [
              {
                labTestId: glucosa.id,
                priceSnapshot: glucosa.price,
              },
              {
                labTestId: hemoglobina.id,
                priceSnapshot: hemoglobina.price,
              },
            ],
          },
        },
      },
    });

    const orderItem = await prisma.labOrderItem.findFirst({
      where: { orderId: order.id, labTestId: glucosa.id },
    });

    if (orderItem) {
      await prisma.labResult.create({
        data: {
          orderItemId: orderItem.id,
          reportedAt: new Date(),
          reportedBy: "Bioquímica",
          items: {
            createMany: {
              data: [
                {
                  paramNameSnapshot: "Glucosa",
                  unitSnapshot: "mg/dL",
                  refTextSnapshot: "70 - 110",
                  refMinSnapshot: 70,
                  refMaxSnapshot: 110,
                  value: "92",
                  isOutOfRange: false,
                  order: 1,
                },
              ],
            },
          },
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
