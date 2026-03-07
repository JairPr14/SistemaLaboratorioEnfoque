--
-- PostgreSQL database dump
--

\restrict y2x6i3VFwdbRD8yLaozMBvLrhQl1Yb76VEvqBuxLszceoaXh8xV7oTXKAv2VusS

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_roleId_fkey";
ALTER TABLE IF EXISTS ONLY public."UserFavoriteTest" DROP CONSTRAINT IF EXISTS "UserFavoriteTest_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."UserFavoriteTest" DROP CONSTRAINT IF EXISTS "UserFavoriteTest_labTestId_fkey";
ALTER TABLE IF EXISTS ONLY public."TestProfileItem" DROP CONSTRAINT IF EXISTS "TestProfileItem_profileId_fkey";
ALTER TABLE IF EXISTS ONLY public."TestProfileItem" DROP CONSTRAINT IF EXISTS "TestProfileItem_labTestId_fkey";
ALTER TABLE IF EXISTS ONLY public."StaffShiftCount" DROP CONSTRAINT IF EXISTS "StaffShiftCount_staffMemberId_fkey";
ALTER TABLE IF EXISTS ONLY public."StaffShiftCount" DROP CONSTRAINT IF EXISTS "StaffShiftCount_payrollPeriodId_fkey";
ALTER TABLE IF EXISTS ONLY public."StaffDiscount" DROP CONSTRAINT IF EXISTS "StaffDiscount_staffMemberId_fkey";
ALTER TABLE IF EXISTS ONLY public."StaffDiscount" DROP CONSTRAINT IF EXISTS "StaffDiscount_discountTypeId_fkey";
ALTER TABLE IF EXISTS ONLY public."ReferredLabPayment" DROP CONSTRAINT IF EXISTS "ReferredLabPayment_referredLabId_fkey";
ALTER TABLE IF EXISTS ONLY public."ReferredLabPayment" DROP CONSTRAINT IF EXISTS "ReferredLabPayment_recordedById_fkey";
ALTER TABLE IF EXISTS ONLY public."ReferredLabPayment" DROP CONSTRAINT IF EXISTS "ReferredLabPayment_orderId_fkey";
ALTER TABLE IF EXISTS ONLY public."Payroll" DROP CONSTRAINT IF EXISTS "Payroll_staffMemberId_fkey";
ALTER TABLE IF EXISTS ONLY public."Payroll" DROP CONSTRAINT IF EXISTS "Payroll_payrollPeriodId_fkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_recordedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_orderId_fkey";
ALTER TABLE IF EXISTS ONLY public."NotificationRead" DROP CONSTRAINT IF EXISTS "NotificationRead_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."NotificationRead" DROP CONSTRAINT IF EXISTS "NotificationRead_notificationId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabTest" DROP CONSTRAINT IF EXISTS "LabTest_sectionId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabTest" DROP CONSTRAINT IF EXISTS "LabTest_referredLabId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabTestReferredLab" DROP CONSTRAINT IF EXISTS "LabTestReferredLab_referredLabId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabTestReferredLab" DROP CONSTRAINT IF EXISTS "LabTestReferredLab_labTestId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabTemplate" DROP CONSTRAINT IF EXISTS "LabTemplate_labTestId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabTemplateItem" DROP CONSTRAINT IF EXISTS "LabTemplateItem_templateId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabTemplateItemRefRange" DROP CONSTRAINT IF EXISTS "LabTemplateItemRefRange_templateItemId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabResult" DROP CONSTRAINT IF EXISTS "LabResult_validatedById_fkey";
ALTER TABLE IF EXISTS ONLY public."LabResult" DROP CONSTRAINT IF EXISTS "LabResult_orderItemId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabResultItem" DROP CONSTRAINT IF EXISTS "LabResultItem_templateItemId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabResultItem" DROP CONSTRAINT IF EXISTS "LabResultItem_resultId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabOrder" DROP CONSTRAINT IF EXISTS "LabOrder_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabOrder" DROP CONSTRAINT IF EXISTS "LabOrder_branchId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabOrderItem" DROP CONSTRAINT IF EXISTS "LabOrderItem_referredLabId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabOrderItem" DROP CONSTRAINT IF EXISTS "LabOrderItem_orderId_fkey";
ALTER TABLE IF EXISTS ONLY public."LabOrderItem" DROP CONSTRAINT IF EXISTS "LabOrderItem_labTestId_fkey";
DROP INDEX IF EXISTS public."User_roleId_idx";
DROP INDEX IF EXISTS public."User_email_key";
DROP INDEX IF EXISTS public."User_email_idx";
DROP INDEX IF EXISTS public."UserFavoriteTest_userId_labTestId_key";
DROP INDEX IF EXISTS public."UserFavoriteTest_userId_idx";
DROP INDEX IF EXISTS public."TestProfileItem_profileId_labTestId_key";
DROP INDEX IF EXISTS public."TestProfileItem_profileId_idx";
DROP INDEX IF EXISTS public."StoredImage_key_key";
DROP INDEX IF EXISTS public."StoredImage_key_idx";
DROP INDEX IF EXISTS public."StaffShiftCount_staffMemberId_payrollPeriodId_key";
DROP INDEX IF EXISTS public."StaffShiftCount_staffMemberId_idx";
DROP INDEX IF EXISTS public."StaffShiftCount_payrollPeriodId_idx";
DROP INDEX IF EXISTS public."StaffMember_lastName_idx";
DROP INDEX IF EXISTS public."StaffMember_isActive_idx";
DROP INDEX IF EXISTS public."StaffDiscount_staffMemberId_idx";
DROP INDEX IF EXISTS public."StaffDiscount_periodYear_periodMonth_periodQuincena_idx";
DROP INDEX IF EXISTS public."Role_code_key";
DROP INDEX IF EXISTS public."Role_code_idx";
DROP INDEX IF EXISTS public."ReferredLab_isActive_idx";
DROP INDEX IF EXISTS public."ReferredLabPayment_referredLabId_idx";
DROP INDEX IF EXISTS public."ReferredLabPayment_paidAt_idx";
DROP INDEX IF EXISTS public."ReferredLabPayment_orderId_idx";
DROP INDEX IF EXISTS public."PreAnalyticNoteTemplate_isActive_idx";
DROP INDEX IF EXISTS public."PreAnalyticNoteTemplate_code_key";
DROP INDEX IF EXISTS public."PreAnalyticNoteTemplate_code_idx";
DROP INDEX IF EXISTS public."Payroll_staffMemberId_payrollPeriodId_key";
DROP INDEX IF EXISTS public."Payroll_staffMemberId_idx";
DROP INDEX IF EXISTS public."Payroll_payrollPeriodId_idx";
DROP INDEX IF EXISTS public."PayrollPeriod_year_month_quincena_key";
DROP INDEX IF EXISTS public."PayrollPeriod_year_month_quincena_idx";
DROP INDEX IF EXISTS public."Payment_paidAt_idx";
DROP INDEX IF EXISTS public."Payment_orderId_idx";
DROP INDEX IF EXISTS public."Payment_method_idx";
DROP INDEX IF EXISTS public."Patient_dni_key";
DROP INDEX IF EXISTS public."Patient_dni_idx";
DROP INDEX IF EXISTS public."Patient_code_key";
DROP INDEX IF EXISTS public."Patient_code_idx";
DROP INDEX IF EXISTS public."Notification_type_idx";
DROP INDEX IF EXISTS public."Notification_createdAt_idx";
DROP INDEX IF EXISTS public."NotificationRead_userId_idx";
DROP INDEX IF EXISTS public."NotificationRead_notificationId_userId_key";
DROP INDEX IF EXISTS public."LabTest_sectionId_idx";
DROP INDEX IF EXISTS public."LabTest_referredLabId_idx";
DROP INDEX IF EXISTS public."LabTest_isActive_idx";
DROP INDEX IF EXISTS public."LabTest_code_key";
DROP INDEX IF EXISTS public."LabTestReferredLab_referredLabId_idx";
DROP INDEX IF EXISTS public."LabTestReferredLab_labTestId_referredLabId_key";
DROP INDEX IF EXISTS public."LabTemplate_labTestId_key";
DROP INDEX IF EXISTS public."LabTemplateItemRefRange_templateItemId_idx";
DROP INDEX IF EXISTS public."LabSection_code_key";
DROP INDEX IF EXISTS public."LabSection_code_idx";
DROP INDEX IF EXISTS public."LabResult_validatedById_idx";
DROP INDEX IF EXISTS public."LabResult_orderItemId_key";
DROP INDEX IF EXISTS public."LabOrder_status_idx";
DROP INDEX IF EXISTS public."LabOrder_priceType_idx";
DROP INDEX IF EXISTS public."LabOrder_patientType_idx";
DROP INDEX IF EXISTS public."LabOrder_orderSource_idx";
DROP INDEX IF EXISTS public."LabOrder_orderCode_key";
DROP INDEX IF EXISTS public."LabOrder_createdAt_idx";
DROP INDEX IF EXISTS public."LabOrder_branchId_idx";
DROP INDEX IF EXISTS public."LabOrderItem_referredLabId_idx";
DROP INDEX IF EXISTS public."DiscountType_code_key";
DROP INDEX IF EXISTS public."DiscountType_code_idx";
DROP INDEX IF EXISTS public."Branch_order_idx";
DROP INDEX IF EXISTS public."Branch_code_key";
DROP INDEX IF EXISTS public."Branch_code_idx";
DROP INDEX IF EXISTS public."AppConfig_key_key";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."UserFavoriteTest" DROP CONSTRAINT IF EXISTS "UserFavoriteTest_pkey";
ALTER TABLE IF EXISTS ONLY public."TestProfile" DROP CONSTRAINT IF EXISTS "TestProfile_pkey";
ALTER TABLE IF EXISTS ONLY public."TestProfileItem" DROP CONSTRAINT IF EXISTS "TestProfileItem_pkey";
ALTER TABLE IF EXISTS ONLY public."StoredImage" DROP CONSTRAINT IF EXISTS "StoredImage_pkey";
ALTER TABLE IF EXISTS ONLY public."StaffShiftCount" DROP CONSTRAINT IF EXISTS "StaffShiftCount_pkey";
ALTER TABLE IF EXISTS ONLY public."StaffMember" DROP CONSTRAINT IF EXISTS "StaffMember_pkey";
ALTER TABLE IF EXISTS ONLY public."StaffDiscount" DROP CONSTRAINT IF EXISTS "StaffDiscount_pkey";
ALTER TABLE IF EXISTS ONLY public."Role" DROP CONSTRAINT IF EXISTS "Role_pkey";
ALTER TABLE IF EXISTS ONLY public."ReferredLab" DROP CONSTRAINT IF EXISTS "ReferredLab_pkey";
ALTER TABLE IF EXISTS ONLY public."ReferredLabPayment" DROP CONSTRAINT IF EXISTS "ReferredLabPayment_pkey";
ALTER TABLE IF EXISTS ONLY public."PreAnalyticNoteTemplate" DROP CONSTRAINT IF EXISTS "PreAnalyticNoteTemplate_pkey";
ALTER TABLE IF EXISTS ONLY public."Payroll" DROP CONSTRAINT IF EXISTS "Payroll_pkey";
ALTER TABLE IF EXISTS ONLY public."PayrollPeriod" DROP CONSTRAINT IF EXISTS "PayrollPeriod_pkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_pkey";
ALTER TABLE IF EXISTS ONLY public."Patient" DROP CONSTRAINT IF EXISTS "Patient_pkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_pkey";
ALTER TABLE IF EXISTS ONLY public."NotificationRead" DROP CONSTRAINT IF EXISTS "NotificationRead_pkey";
ALTER TABLE IF EXISTS ONLY public."LabTest" DROP CONSTRAINT IF EXISTS "LabTest_pkey";
ALTER TABLE IF EXISTS ONLY public."LabTestReferredLab" DROP CONSTRAINT IF EXISTS "LabTestReferredLab_pkey";
ALTER TABLE IF EXISTS ONLY public."LabTemplate" DROP CONSTRAINT IF EXISTS "LabTemplate_pkey";
ALTER TABLE IF EXISTS ONLY public."LabTemplateItem" DROP CONSTRAINT IF EXISTS "LabTemplateItem_pkey";
ALTER TABLE IF EXISTS ONLY public."LabTemplateItemRefRange" DROP CONSTRAINT IF EXISTS "LabTemplateItemRefRange_pkey";
ALTER TABLE IF EXISTS ONLY public."LabSection" DROP CONSTRAINT IF EXISTS "LabSection_pkey";
ALTER TABLE IF EXISTS ONLY public."LabResult" DROP CONSTRAINT IF EXISTS "LabResult_pkey";
ALTER TABLE IF EXISTS ONLY public."LabResultItem" DROP CONSTRAINT IF EXISTS "LabResultItem_pkey";
ALTER TABLE IF EXISTS ONLY public."LabOrder" DROP CONSTRAINT IF EXISTS "LabOrder_pkey";
ALTER TABLE IF EXISTS ONLY public."LabOrderItem" DROP CONSTRAINT IF EXISTS "LabOrderItem_pkey";
ALTER TABLE IF EXISTS ONLY public."DiscountType" DROP CONSTRAINT IF EXISTS "DiscountType_pkey";
ALTER TABLE IF EXISTS ONLY public."Branch" DROP CONSTRAINT IF EXISTS "Branch_pkey";
ALTER TABLE IF EXISTS ONLY public."AppConfig" DROP CONSTRAINT IF EXISTS "AppConfig_pkey";
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TABLE IF EXISTS public."UserFavoriteTest";
DROP TABLE IF EXISTS public."User";
DROP TABLE IF EXISTS public."TestProfileItem";
DROP TABLE IF EXISTS public."TestProfile";
DROP TABLE IF EXISTS public."StoredImage";
DROP TABLE IF EXISTS public."StaffShiftCount";
DROP TABLE IF EXISTS public."StaffMember";
DROP TABLE IF EXISTS public."StaffDiscount";
DROP TABLE IF EXISTS public."Role";
DROP TABLE IF EXISTS public."ReferredLabPayment";
DROP TABLE IF EXISTS public."ReferredLab";
DROP TABLE IF EXISTS public."PreAnalyticNoteTemplate";
DROP TABLE IF EXISTS public."PayrollPeriod";
DROP TABLE IF EXISTS public."Payroll";
DROP TABLE IF EXISTS public."Payment";
DROP TABLE IF EXISTS public."Patient";
DROP TABLE IF EXISTS public."NotificationRead";
DROP TABLE IF EXISTS public."Notification";
DROP TABLE IF EXISTS public."LabTestReferredLab";
DROP TABLE IF EXISTS public."LabTest";
DROP TABLE IF EXISTS public."LabTemplateItemRefRange";
DROP TABLE IF EXISTS public."LabTemplateItem";
DROP TABLE IF EXISTS public."LabTemplate";
DROP TABLE IF EXISTS public."LabSection";
DROP TABLE IF EXISTS public."LabResultItem";
DROP TABLE IF EXISTS public."LabResult";
DROP TABLE IF EXISTS public."LabOrderItem";
DROP TABLE IF EXISTS public."LabOrder";
DROP TABLE IF EXISTS public."DiscountType";
DROP TABLE IF EXISTS public."Branch";
DROP TABLE IF EXISTS public."AppConfig";
DROP TYPE IF EXISTS public."ValueType";
DROP TYPE IF EXISTS public."Sex";
DROP TYPE IF EXISTS public."PaymentMethod";
DROP TYPE IF EXISTS public."OrderStatus";
DROP TYPE IF EXISTS public."OrderSource";
DROP TYPE IF EXISTS public."OrderPriceType";
DROP TYPE IF EXISTS public."OrderPatientType";
DROP TYPE IF EXISTS public."OrderItemStatus";
--
-- Name: OrderItemStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderItemStatus" AS ENUM (
    'PENDIENTE',
    'EN_PROCESO',
    'COMPLETADO'
);


--
-- Name: OrderPatientType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderPatientType" AS ENUM (
    'CLINICA',
    'EXTERNO',
    'IZAGA'
);


--
-- Name: OrderPriceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderPriceType" AS ENUM (
    'PUBLICO',
    'CONVENIO'
);


--
-- Name: OrderSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderSource" AS ENUM (
    'ADMISION',
    'LABORATORIO'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDIENTE',
    'EN_PROCESO',
    'COMPLETADO',
    'ENTREGADO',
    'ANULADO'
);


--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'EFECTIVO',
    'TARJETA',
    'TRANSFERENCIA',
    'CREDITO',
    'YAPE',
    'PLIN'
);


--
-- Name: Sex; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Sex" AS ENUM (
    'M',
    'F',
    'O'
);


--
-- Name: ValueType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ValueType" AS ENUM (
    'NUMBER',
    'TEXT',
    'SELECT',
    'DECIMAL',
    'PERCENTAGE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AppConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AppConfig" (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL
);


--
-- Name: Branch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Branch" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    "order" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DiscountType; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DiscountType" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "splitAcrossQuincenas" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);


--
-- Name: LabOrder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabOrder" (
    id text NOT NULL,
    "orderCode" text NOT NULL,
    "patientId" text NOT NULL,
    "requestedBy" text,
    notes text,
    status public."OrderStatus" DEFAULT 'PENDIENTE'::public."OrderStatus" NOT NULL,
    "totalPrice" double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deliveredAt" timestamp(3) without time zone,
    "patientType" text,
    "branchId" text,
    "preAnalyticNote" text,
    "orderSource" public."OrderSource" DEFAULT 'LABORATORIO'::public."OrderSource" NOT NULL,
    "createdById" text,
    "admissionSettledAt" timestamp(3) without time zone,
    "priceType" public."OrderPriceType" DEFAULT 'PUBLICO'::public."OrderPriceType" NOT NULL
);


--
-- Name: LabOrderItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabOrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "labTestId" text NOT NULL,
    status public."OrderItemStatus" DEFAULT 'PENDIENTE'::public."OrderItemStatus" NOT NULL,
    "priceSnapshot" double precision NOT NULL,
    "templateSnapshot" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "promotionId" text,
    "promotionName" text,
    "priceConventionSnapshot" double precision,
    "referredLabId" text,
    "externalLabCostSnapshot" double precision
);


--
-- Name: LabResult; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabResult" (
    id text NOT NULL,
    "orderItemId" text NOT NULL,
    "reportedAt" timestamp(3) without time zone,
    "reportedBy" text,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isDraft" boolean DEFAULT true NOT NULL,
    "validatedAt" timestamp(3) without time zone,
    "validatedById" text
);


--
-- Name: LabResultItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabResultItem" (
    id text NOT NULL,
    "resultId" text NOT NULL,
    "templateItemId" text,
    "paramNameSnapshot" text NOT NULL,
    "unitSnapshot" text,
    "refTextSnapshot" text,
    "refMinSnapshot" double precision,
    "refMaxSnapshot" double precision,
    value text NOT NULL,
    "isOutOfRange" boolean DEFAULT false NOT NULL,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isHighlighted" boolean DEFAULT false NOT NULL
);


--
-- Name: LabSection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabSection" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: LabTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabTemplate" (
    id text NOT NULL,
    "labTestId" text NOT NULL,
    title text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL
);


--
-- Name: LabTemplateItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabTemplateItem" (
    id text NOT NULL,
    "templateId" text NOT NULL,
    "groupName" text,
    "paramName" text NOT NULL,
    unit text,
    "refRangeText" text,
    "refMin" double precision,
    "refMax" double precision,
    "valueType" text NOT NULL,
    "selectOptions" text DEFAULT '[]'::text NOT NULL,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    description text
);


--
-- Name: LabTemplateItemRefRange; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabTemplateItemRefRange" (
    id text NOT NULL,
    "templateItemId" text NOT NULL,
    "ageGroup" text,
    sex public."Sex",
    "refRangeText" text,
    "refMin" double precision,
    "refMax" double precision,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: LabTest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabTest" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    price double precision NOT NULL,
    "estimatedTimeMinutes" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "sectionId" text NOT NULL,
    "isReferred" boolean DEFAULT false NOT NULL,
    "referredLabId" text,
    "priceToAdmission" double precision,
    "externalLabCost" double precision
);


--
-- Name: LabTestReferredLab; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LabTestReferredLab" (
    id text DEFAULT gen_random_uuid() NOT NULL,
    "labTestId" text NOT NULL,
    "referredLabId" text NOT NULL,
    "priceToAdmission" double precision,
    "externalLabCost" double precision,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    "linkTo" text,
    "relatedOrderId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: NotificationRead; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NotificationRead" (
    id text NOT NULL,
    "notificationId" text NOT NULL,
    "userId" text NOT NULL,
    "readAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Patient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Patient" (
    id text NOT NULL,
    code text NOT NULL,
    dni text,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "birthDate" timestamp(3) without time zone NOT NULL,
    sex public."Sex" NOT NULL,
    phone text,
    address text,
    email text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    amount double precision NOT NULL,
    method public."PaymentMethod" NOT NULL,
    notes text,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Payroll; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payroll" (
    id text NOT NULL,
    "staffMemberId" text NOT NULL,
    "payrollPeriodId" text NOT NULL,
    "baseSalary" double precision NOT NULL,
    "discountsTotal" double precision DEFAULT 0 NOT NULL,
    "netSalary" double precision NOT NULL,
    status text DEFAULT 'PENDIENTE'::text NOT NULL,
    "paymentMethod" text,
    "transferNumber" text,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PayrollPeriod; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PayrollPeriod" (
    id text NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    quincena integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PreAnalyticNoteTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PreAnalyticNoteTemplate" (
    id text NOT NULL,
    code text NOT NULL,
    title text NOT NULL,
    text text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ReferredLab; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReferredLab" (
    id text NOT NULL,
    name text NOT NULL,
    "logoUrl" text,
    "stampImageUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ReferredLabPayment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReferredLabPayment" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "referredLabId" text NOT NULL,
    amount double precision NOT NULL,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    permissions text
);


--
-- Name: StaffDiscount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StaffDiscount" (
    id text NOT NULL,
    "staffMemberId" text NOT NULL,
    "discountTypeId" text NOT NULL,
    amount double precision NOT NULL,
    "periodYear" integer NOT NULL,
    "periodMonth" integer NOT NULL,
    "periodQuincena" integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'PENDIENTE'::text NOT NULL,
    "payrollId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StaffMember; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StaffMember" (
    id text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    age integer,
    "jobTitle" text,
    phone text,
    address text,
    salary double precision,
    "hireDate" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "paymentType" text DEFAULT 'MENSUAL'::text NOT NULL,
    "ratePerShift" double precision
);


--
-- Name: StaffShiftCount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StaffShiftCount" (
    id text NOT NULL,
    "staffMemberId" text NOT NULL,
    "payrollPeriodId" text NOT NULL,
    "shiftsCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StoredImage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StoredImage" (
    id text NOT NULL,
    key text NOT NULL,
    "mimeType" text NOT NULL,
    data bytea NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TestProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TestProfile" (
    id text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "packagePrice" double precision
);


--
-- Name: TestProfileItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TestProfileItem" (
    id text NOT NULL,
    "profileId" text NOT NULL,
    "labTestId" text NOT NULL,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "roleId" text
);


--
-- Name: UserFavoriteTest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserFavoriteTest" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "labTestId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: AppConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AppConfig" (id, key, value) FROM stdin;
\.


--
-- Data for Name: Branch; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Branch" (id, code, name, address, phone, "order", "isActive", "createdAt", "updatedAt") FROM stdin;
6214e17e-4822-4f09-abdf-5bddb4c1eb5a	CLINICA	Clínica	\N	\N	1	t	2026-03-07 01:34:05.278	2026-03-07 01:34:05.278
199b51d2-59b8-4003-8f9b-2a814a879acc	EXTERNO	Externo	\N	\N	2	t	2026-03-07 01:34:05.278	2026-03-07 01:34:05.278
73649d98-b69c-41c2-8adb-4be5cee0cdee	IZAGA	Izaga	\N	\N	3	t	2026-03-07 01:34:05.278	2026-03-07 01:34:05.278
\.


--
-- Data for Name: DiscountType; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DiscountType" (id, code, name, "splitAcrossQuincenas", "isActive", "order") FROM stdin;
cmmfnhmwv0003wejcz8n2emvp	AFP	AFP	t	t	0
cmmfnhmwx0004wejcbohxhtfc	ONP	ONP	t	t	1
cmmfnhmwz0005wejcvo305an7	ADELANTO	Adelanto	f	t	2
cmmfnhmx00006wejc4q9rqh84	PRESTAMO	Préstamo	f	t	3
\.


--
-- Data for Name: LabOrder; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabOrder" (id, "orderCode", "patientId", "requestedBy", notes, status, "totalPrice", "createdAt", "updatedAt", "deliveredAt", "patientType", "branchId", "preAnalyticNote", "orderSource", "createdById", "admissionSettledAt", "priceType") FROM stdin;
\.


--
-- Data for Name: LabOrderItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabOrderItem" (id, "orderId", "labTestId", status, "priceSnapshot", "templateSnapshot", "createdAt", "updatedAt", "promotionId", "promotionName", "priceConventionSnapshot", "referredLabId", "externalLabCostSnapshot") FROM stdin;
\.


--
-- Data for Name: LabResult; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabResult" (id, "orderItemId", "reportedAt", "reportedBy", comment, "createdAt", "updatedAt", "isDraft", "validatedAt", "validatedById") FROM stdin;
\.


--
-- Data for Name: LabResultItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabResultItem" (id, "resultId", "templateItemId", "paramNameSnapshot", "unitSnapshot", "refTextSnapshot", "refMinSnapshot", "refMaxSnapshot", value, "isOutOfRange", "order", "createdAt", "updatedAt", "isHighlighted") FROM stdin;
\.


--
-- Data for Name: LabSection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabSection" (id, code, name, "order", "isActive", "createdAt", "updatedAt") FROM stdin;
473503ae-fc36-401c-a354-dc674539bca4	BIOQUIMICA	Bioquímica	0	t	2026-03-07 01:34:05.298	2026-03-07 01:34:05.298
5eaaa1d7-0f98-454f-a44e-b7a17ec01a07	HEMATOLOGIA	Hematología	1	t	2026-03-07 01:34:05.298	2026-03-07 01:34:05.298
50905ac9-e461-41a5-89f4-a9462b1a24a2	INMUNOLOGIA	Inmunología	2	t	2026-03-07 01:34:05.298	2026-03-07 01:34:05.298
fa050497-277e-4fd3-a964-5eaed969ee4d	ORINA	Orina	3	t	2026-03-07 01:34:05.298	2026-03-07 01:34:05.298
e8f363e4-7678-4800-ab17-9583cd92504c	HECES	Heces	4	t	2026-03-07 01:34:05.298	2026-03-07 01:34:05.298
38ea3c5a-06e1-41f5-8167-432a736a476b	OTROS	Otros	5	t	2026-03-07 01:34:05.298	2026-03-07 01:34:05.298
\.


--
-- Data for Name: LabTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabTemplate" (id, "labTestId", title, notes, "createdAt", "updatedAt", "isVerified") FROM stdin;
\.


--
-- Data for Name: LabTemplateItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabTemplateItem" (id, "templateId", "groupName", "paramName", unit, "refRangeText", "refMin", "refMax", "valueType", "selectOptions", "order", "createdAt", "updatedAt", description) FROM stdin;
\.


--
-- Data for Name: LabTemplateItemRefRange; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabTemplateItemRefRange" (id, "templateItemId", "ageGroup", sex, "refRangeText", "refMin", "refMax", "order", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LabTest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabTest" (id, code, name, price, "estimatedTimeMinutes", "isActive", "createdAt", "updatedAt", "deletedAt", "sectionId", "isReferred", "referredLabId", "priceToAdmission", "externalLabCost") FROM stdin;
\.


--
-- Data for Name: LabTestReferredLab; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LabTestReferredLab" (id, "labTestId", "referredLabId", "priceToAdmission", "externalLabCost", "isDefault", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, type, title, message, "linkTo", "relatedOrderId", "createdAt") FROM stdin;
\.


--
-- Data for Name: NotificationRead; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."NotificationRead" (id, "notificationId", "userId", "readAt") FROM stdin;
\.


--
-- Data for Name: Patient; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Patient" (id, code, dni, "firstName", "lastName", "birthDate", sex, phone, address, email, "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Payment" (id, "orderId", amount, method, notes, "paidAt", "recordedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Payroll; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Payroll" (id, "staffMemberId", "payrollPeriodId", "baseSalary", "discountsTotal", "netSalary", status, "paymentMethod", "transferNumber", "paidAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PayrollPeriod; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PayrollPeriod" (id, year, month, quincena, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PreAnalyticNoteTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PreAnalyticNoteTemplate" (id, code, title, text, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ReferredLab; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReferredLab" (id, name, "logoUrl", "stampImageUrl", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ReferredLabPayment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReferredLabPayment" (id, "orderId", "referredLabId", amount, "paidAt", notes, "recordedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Role" (id, code, name, description, "isActive", "createdAt", "updatedAt", permissions) FROM stdin;
cmmfnh8ov0000wea0wrwwn9nj	ADMIN	Administrador	Acceso total al sistema	t	2026-03-07 01:34:09.725	2026-03-07 01:34:28.143	\N
cmmfnh8pd0001wea0x6i5io7c	LAB	Laboratorio	Registro de resultados y plantillas	t	2026-03-07 01:34:09.745	2026-03-07 01:34:28.149	["VER_CATALOGO","VER_ORDENES","QUICK_ACTIONS_ANALISTA","CAPTURAR_RESULTADOS","VALIDAR_RESULTADOS","IMPRIMIR_RESULTADOS","VER_PACIENTES","GESTIONAR_PLANTILLAS"]
cmmfnh8pf0002wea0lqb5ermm	RECEPTION	Recepción	Pacientes y órdenes	t	2026-03-07 01:34:09.747	2026-03-07 01:34:28.151	["VER_PACIENTES","EDITAR_PACIENTES","VER_CATALOGO","VER_ORDENES","QUICK_ACTIONS_RECEPCION","VER_PAGOS","REGISTRAR_PAGOS","IMPRIMIR_TICKET_PAGO"]
\.


--
-- Data for Name: StaffDiscount; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StaffDiscount" (id, "staffMemberId", "discountTypeId", amount, "periodYear", "periodMonth", "periodQuincena", status, "payrollId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StaffMember; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StaffMember" (id, "firstName", "lastName", age, "jobTitle", phone, address, salary, "hireDate", "isActive", "createdAt", "updatedAt", "paymentType", "ratePerShift") FROM stdin;
\.


--
-- Data for Name: StaffShiftCount; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StaffShiftCount" (id, "staffMemberId", "payrollPeriodId", "shiftsCount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StoredImage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StoredImage" (id, key, "mimeType", data, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TestProfile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TestProfile" (id, name, "isActive", "createdAt", "updatedAt", "packagePrice") FROM stdin;
\.


--
-- Data for Name: TestProfileItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TestProfileItem" (id, "profileId", "labTestId", "order", "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, "passwordHash", name, "isActive", "createdAt", "updatedAt", "roleId") FROM stdin;
cmmfnh8rh0004wea023yarchv	admin@sistemalis.local	$2b$10$tJH33zshhDqe3e5oqMU6IuW8VqRkMBZSi.87mPAancf1Dc/0IjzkW	Administrador	t	2026-03-07 01:34:09.821	2026-03-07 01:34:09.821	cmmfnh8ov0000wea0wrwwn9nj
\.


--
-- Data for Name: UserFavoriteTest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserFavoriteTest" (id, "userId", "labTestId", "createdAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
3d123203-500e-4c3d-b451-c29251193b3b	cf588698371bc3d183cfcb2b2021a78c92a37931b23f6447c01b1dc2155ac16e	2026-03-07 01:34:05.499964+00	20260226000000_add_referred_lab_payments	\N	\N	2026-03-07 01:34:05.475334+00	1
e9b990dc-3d40-4efe-97a4-d56e0a450a9b	1ec3b6dd7af7cd56649363ec8ac986cb325adbc904e61fc4473f5e055893fc99	2026-03-07 01:34:05.113437+00	20260209153356_init	\N	\N	2026-03-07 01:34:05.040727+00	1
44951409-de60-436e-a286-da9680df0be5	0d5e1c2d46b297930e9a1a0d97bda0e6cc26a06fcfce715e9633be8e63d6faae	2026-03-07 01:34:05.274327+00	20260213010000_add_stored_image	\N	\N	2026-03-07 01:34:05.261961+00	1
a4360c17-a6c6-4a67-b52b-76750714f413	e5760800aff0205493d34adad4dcb2efeba37749533137e955cc0ab971fbfbb3	2026-03-07 01:34:05.119184+00	20260209220220_add_template_item_description	\N	\N	2026-03-07 01:34:05.114957+00	1
d0dd7a31-0509-4482-9592-23e45143ef09	270b63c724bc54f2bcbc0f93d7b83db333502044e71d5345ae233e22022bfb5a	2026-03-07 01:34:05.133562+00	20260209231908_add_user	\N	\N	2026-03-07 01:34:05.120737+00	1
d82f70bb-51e7-427b-afd2-18bda1c1578d	b97ec2c086b6c1b9fc58ea68b70bf340d70287d0dc4c49b83c177851a1e3caf4	2026-03-07 01:34:05.15035+00	20260209233000_add_roles	\N	\N	2026-03-07 01:34:05.135098+00	1
c232d5db-5d83-4e2e-81e8-f29cc1b2acbe	c07a5b689449921965f9e63615fe38046b81642c01db19ac4a54b1903e46b282	2026-03-07 01:34:05.294457+00	20260213100000_add_branches	\N	\N	2026-03-07 01:34:05.275853+00	1
fcb32461-55b6-4ae8-851f-74cebb17db2f	f082c5ed7f425efabec695a1cff2b80ff93f1906e117dec8599746c67fad9e98	2026-03-07 01:34:05.164518+00	20260210035434_add_app_config	\N	\N	2026-03-07 01:34:05.152167+00	1
a0c025af-022e-4255-8aed-47b5e9605c1f	c23fd62d8ed50090c7776c8ccf3420a50d25d245abc010e210ccd5ae00332ad1	2026-03-07 01:34:05.195509+00	20260210062053_add_profiles_favorites	\N	\N	2026-03-07 01:34:05.166208+00	1
8ccad734-1ec4-47e2-99bb-5012d47c95a6	0bbd148de2e3ecefd78b447088564d81b9862b4c22310d1f1147c937ec6a10f2	2026-03-07 01:34:05.640259+00	20260302000000_make_patient_dni_optional	\N	\N	2026-03-07 01:34:05.635785+00	1
36ff3efa-fc0e-46f0-8a07-bbc1c6202bf8	2c58643127a85774ac9667a7cb4c49ccf4a8ff09907fda2e4d5fe46ddc532403	2026-03-07 01:34:05.201592+00	20260210064308_add_result_is_draft	\N	\N	2026-03-07 01:34:05.197005+00	1
d686ccc6-5f77-442b-9a31-5a3c31e91be1	534023df6875606f73012853e42b463022f066f696e7de0c03921680eccb045a	2026-03-07 01:34:05.315683+00	20260220000000_add_lab_section_table	\N	\N	2026-03-07 01:34:05.295949+00	1
71d4e704-93f4-40a5-86e4-06ba60672f4b	b3ad7a367bc823c7f1a3aeb47fc4a5d1386bf406aa69fe43327db1cd4ba4f50f	2026-03-07 01:34:05.214754+00	20260210165317_add_ref_ranges	\N	\N	2026-03-07 01:34:05.203165+00	1
24e0058d-0acc-4f2b-aad0-c13bab7d8ae1	b40d42c49a13c0928a782d1a8f18ae17893624646b19eb25c59fe511539147ec	2026-03-07 01:34:05.222331+00	20260210213419_add_order_patient_type	\N	\N	2026-03-07 01:34:05.216322+00	1
a38a6330-efef-47c6-b53d-04690ba8ebcd	bcd8becf1a55d460d377b07b8cbc3a6a97f4ccdacaca6fd1eefeaece702e3645	2026-03-07 01:34:05.506324+00	20260226120000_add_result_item_highlight	\N	\N	2026-03-07 01:34:05.501604+00	1
29527b26-7b2b-49cc-bc1d-1a825b5fe4bc	e879c5f4bc7d8021fd314e79942f72de3999e038cbd7ba75c12fc071dcbb1350	2026-03-07 01:34:05.228733+00	20260212000000_add_package_price_to_test_profile	\N	\N	2026-03-07 01:34:05.22424+00	1
8ffd56df-9d16-49ef-bd55-9f47e383c312	ead9198daf7918e81859f374f6462f0465a29d7a0ab26f55f610f463101d1a6e	2026-03-07 01:34:05.332398+00	20260222000000_add_preanalytic_notes	\N	\N	2026-03-07 01:34:05.31735+00	1
02195010-74ee-46e8-a7cf-87e72f4c4248	8290c9e6b33ec7a1bfba4c70ea91e6e343c0ba1dbcd4ca6bf813a07f7d9d05d3	2026-03-07 01:34:05.234713+00	20260212100000_add_promotion_to_order_item	\N	\N	2026-03-07 01:34:05.230234+00	1
6457750a-a2ab-481a-bae3-12d368186b20	ca05ef79805301f5a67ffdb5bb5346bac4d1e1abf7bc8c0bf8c8702eb45fecce	2026-03-07 01:34:05.240687+00	20260212120000_add_role_permissions	\N	\N	2026-03-07 01:34:05.236438+00	1
fbe2b5b6-3e34-4de8-a9cb-5d9ff47fff57	1315ab10e9de6e1599e63550779875dbcfd803dd5d8b9946fdf013cd00493bb1	2026-03-07 01:34:05.260343+00	20260213000000_add_payments	\N	\N	2026-03-07 01:34:05.242211+00	1
60f1711e-da07-42ab-bad3-f84fa52289fe	39ea2f54aa02e8edd4cae33e204e11f5341881e9378777483e7d5bdddbe95316	2026-03-07 01:34:05.37741+00	20260223120000_add_admission_requests	\N	\N	2026-03-07 01:34:05.333993+00	1
7b11cf77-8243-45c1-8043-a94977be1d8d	b6c7763ac87d7b7eeec9ca3524164e8af738c570aa00546a567e992532e32589	2026-03-07 01:34:05.569525+00	20260301002000_add_lab_test_referred_columns	\N	\N	2026-03-07 01:34:05.560577+00	1
c4d23ba2-e7be-4db1-9eca-cb3146ae3925	522dd10b30e0cecff9e3fb5c22cbe26d77e4999b6afed1ba3faec8ef5689465c	2026-03-07 01:34:05.403834+00	20260223120001_rebuild_admission	\N	\N	2026-03-07 01:34:05.378996+00	1
338fd71b-937d-486a-b22b-5e44a89bb72b	80909381c7857bdd97c0a8fe713c10b6f477bcd64ff266e98001e364aee64193	2026-03-07 01:34:05.512017+00	20260227000000_add_admission_settled_at	\N	\N	2026-03-07 01:34:05.507722+00	1
ea44aa14-2ad4-4b6a-9846-40c0b228879e	13fd1182374aa02439a6815e77196ad329021c09a3cf1791d53a1cc0330f7910	2026-03-07 01:34:05.41021+00	20260224000000_add_decimal_percentage_value_types	\N	\N	2026-03-07 01:34:05.405399+00	1
eec4db7c-f615-4c0b-bc35-baf8126fffaa	7061d9a0d70377c6811cf026d7dcf011a3af8ab67eb8ac77eeed14ed879f6242	2026-03-07 01:34:05.473625+00	20260225000000_add_notifications	\N	\N	2026-03-07 01:34:05.411789+00	1
dbe732b4-26c2-4d2d-bf48-e29f342ebe0e	92fc126ea8864106135e3a9e148c4e18f009fb097fb7784b19804a65a3c7f3f9	2026-03-07 01:34:05.518089+00	20260228000000_add_price_convention_snapshot	\N	\N	2026-03-07 01:34:05.513675+00	1
d0fb7c77-56b4-426c-850e-08071ab00991	56c77f57e216ff55557f09e7719608e65d15596ac7bb66e63c45ca889ca98a7e	2026-03-07 01:34:05.60557+00	20260301003000_add_order_status_enum	\N	\N	2026-03-07 01:34:05.571249+00	1
3450ae23-6c95-4df7-9e37-8819eafb3dcb	b4a58a43d4d98663589d7c9282a7ab08b0b592616f9a9778fcd86ea5c5759560	2026-03-07 01:34:05.545591+00	20260301000000_add_lab_test_referred_lab	\N	\N	2026-03-07 01:34:05.519855+00	1
53cb1af7-6c9d-45af-9d60-a16c020c844c	bbf3cdade9b049a4be08240a145718a4d483a9628692ba101398c33853bc5e33	2026-03-07 01:34:05.558879+00	20260301001000_add_referred_lab_to_order_item	\N	\N	2026-03-07 01:34:05.547242+00	1
386a0c1f-c30e-45f7-bd4c-4a95c221e1dd	496349100f40487051fcd9e59285b9c1ea014f05e005c7da714e9f52179a462d	2026-03-07 01:34:05.634162+00	20260301004000_add_sex_enum	\N	\N	2026-03-07 01:34:05.607354+00	1
ba71272a-d36d-4afa-8505-500e86a10953	8fea7f707150922425c13134cd93c4994367ec0842fee009bc77ef830a50ef39	2026-03-07 01:34:05.764807+00	20260302000200_add_gestion_administrativa_schema	\N	\N	2026-03-07 01:34:05.664773+00	1
eb816a38-1297-4689-ba3f-8417b641a414	718185f8e6a03345862179bdb4112e514e9e98f19f29a6d43af58456c45b3877	2026-03-07 01:34:05.646179+00	20260302000001_fix_patient_null_dni	\N	\N	2026-03-07 01:34:05.641807+00	1
a478d0bf-b164-4fec-b93d-9dbec74f6f4f	0d246b5c51978b142fb763498a0d60e9faaa7ea2c6e2f987b038a9f47461d34d	2026-03-07 01:34:05.663059+00	20260302000100_add_staff_member	\N	\N	2026-03-07 01:34:05.647896+00	1
00fad2a2-85cc-4e69-97a6-d27b9b72cd4e	45373fc4faf821828e00b0b88b925aa6813029be961ad22f5c0c5d1bb75d6620	2026-03-07 01:34:05.783265+00	20260302000300_payroll_quincenal_payment_method	\N	\N	2026-03-07 01:34:05.766455+00	1
69c68687-607c-4cc9-b6da-e477288c5eff	4aa0a4922801595205f2d2b689c36bb22b8af7054eac864705a6829e11e83dcf	2026-03-07 01:34:05.789815+00	20260302000400_payroll_yape_plin_transfer_number	\N	\N	2026-03-07 01:34:05.78518+00	1
59daf53d-79fd-4dc1-b1b9-0edddefddd26	df26960e5884dfaca28f0ed20f83fb39e78b6145ae78d554ad7bde5080602001	2026-03-07 01:34:05.796575+00	20260302000500_discount_split_across_quincenas	\N	\N	2026-03-07 01:34:05.791469+00	1
debbba82-6b80-4dd2-80fb-381b15f2f4bc	0d6f887ab094672050f044f451897e5cf69ee1dd6a7868e445baf5a99d4971f2	2026-03-07 01:34:05.815782+00	20260302000600_staff_salary_type_por_turno	\N	\N	2026-03-07 01:34:05.798203+00	1
2d1dec60-4aba-4aba-96ce-360ccfddbde6	4633fe076afbb8bee82e80773e797316b5dead40e1e4c90718563a0526d2bdf8	2026-03-07 01:34:05.824917+00	20260306000000_add_price_type_to_lab_order	\N	\N	2026-03-07 01:34:05.817352+00	1
50b8a8df-e354-40a3-a6f7-987d387ea44e	78efe2a6619ce0869da2a35153a4cdc686f99e38623ca8fb430df0408c6e0307	2026-03-07 01:34:05.83147+00	20260306100000_drop_admission_status_enum	\N	\N	2026-03-07 01:34:05.826621+00	1
8b39631d-1ecf-411e-8fae-47edc70ed222	94a5f64239aab01e9dc3e9e7dd5b8eb3fecc827d08542f2d7005da10fda92379	2026-03-07 01:34:05.893344+00	20260320000000_simplify_staff_personal	\N	\N	2026-03-07 01:34:05.833073+00	1
fd4754cf-d201-4fea-b5f0-0316090f86fe	1ffe71b76ad2c1c21c757f320e53c7ff485a8784a0ce76d4631b4d72a8027fc2	2026-03-07 01:34:05.940713+00	20260320000001_add_planilla	\N	\N	2026-03-07 01:34:05.895039+00	1
28666823-999f-4624-a6be-f0c3808c2176	3fa806cc7120428e3c5239106e14d2c2b401a5c731c88550e155ca74e9f9a19f	2026-03-07 01:34:05.946889+00	20260320000002_add_lab_template_is_verified	\N	\N	2026-03-07 01:34:05.94226+00	1
6f746f14-f40c-4b09-800a-013d4a1d98ec	a8a8f002eb44251fb07bf3cbfc03e549dde2d275e61d38538567e9a36dac5ffa	2026-03-07 01:58:39.134898+00	20260307015831_add_result_audit_validated	\N	\N	2026-03-07 01:58:39.09704+00	1
57ad9bc5-27b8-40c1-b70b-8fa871c3455a	6ebdf21811a764baafa46edd6c25c3d5160989d7a3a61ed633f2efda823586ce	2026-03-07 03:07:58.777178+00	20260307020000_add_labresult_validated_columns	\N	\N	2026-03-07 03:07:58.755369+00	1
\.


--
-- Name: AppConfig AppConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppConfig"
    ADD CONSTRAINT "AppConfig_pkey" PRIMARY KEY (id);


--
-- Name: Branch Branch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Branch"
    ADD CONSTRAINT "Branch_pkey" PRIMARY KEY (id);


--
-- Name: DiscountType DiscountType_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DiscountType"
    ADD CONSTRAINT "DiscountType_pkey" PRIMARY KEY (id);


--
-- Name: LabOrderItem LabOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabOrderItem"
    ADD CONSTRAINT "LabOrderItem_pkey" PRIMARY KEY (id);


--
-- Name: LabOrder LabOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabOrder"
    ADD CONSTRAINT "LabOrder_pkey" PRIMARY KEY (id);


--
-- Name: LabResultItem LabResultItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabResultItem"
    ADD CONSTRAINT "LabResultItem_pkey" PRIMARY KEY (id);


--
-- Name: LabResult LabResult_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabResult"
    ADD CONSTRAINT "LabResult_pkey" PRIMARY KEY (id);


--
-- Name: LabSection LabSection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabSection"
    ADD CONSTRAINT "LabSection_pkey" PRIMARY KEY (id);


--
-- Name: LabTemplateItemRefRange LabTemplateItemRefRange_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabTemplateItemRefRange"
    ADD CONSTRAINT "LabTemplateItemRefRange_pkey" PRIMARY KEY (id);


--
-- Name: LabTemplateItem LabTemplateItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabTemplateItem"
    ADD CONSTRAINT "LabTemplateItem_pkey" PRIMARY KEY (id);


--
-- Name: LabTemplate LabTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabTemplate"
    ADD CONSTRAINT "LabTemplate_pkey" PRIMARY KEY (id);


--
-- Name: LabTestReferredLab LabTestReferredLab_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabTestReferredLab"
    ADD CONSTRAINT "LabTestReferredLab_pkey" PRIMARY KEY (id);


--
-- Name: LabTest LabTest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabTest"
    ADD CONSTRAINT "LabTest_pkey" PRIMARY KEY (id);


--
-- Name: NotificationRead NotificationRead_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationRead"
    ADD CONSTRAINT "NotificationRead_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Patient Patient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Patient"
    ADD CONSTRAINT "Patient_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: PayrollPeriod PayrollPeriod_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollPeriod"
    ADD CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY (id);


--
-- Name: Payroll Payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payroll"
    ADD CONSTRAINT "Payroll_pkey" PRIMARY KEY (id);


--
-- Name: PreAnalyticNoteTemplate PreAnalyticNoteTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PreAnalyticNoteTemplate"
    ADD CONSTRAINT "PreAnalyticNoteTemplate_pkey" PRIMARY KEY (id);


--
-- Name: ReferredLabPayment ReferredLabPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferredLabPayment"
    ADD CONSTRAINT "ReferredLabPayment_pkey" PRIMARY KEY (id);


--
-- Name: ReferredLab ReferredLab_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferredLab"
    ADD CONSTRAINT "ReferredLab_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: StaffDiscount StaffDiscount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffDiscount"
    ADD CONSTRAINT "StaffDiscount_pkey" PRIMARY KEY (id);


--
-- Name: StaffMember StaffMember_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffMember"
    ADD CONSTRAINT "StaffMember_pkey" PRIMARY KEY (id);


--
-- Name: StaffShiftCount StaffShiftCount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffShiftCount"
    ADD CONSTRAINT "StaffShiftCount_pkey" PRIMARY KEY (id);


--
-- Name: StoredImage StoredImage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StoredImage"
    ADD CONSTRAINT "StoredImage_pkey" PRIMARY KEY (id);


--
-- Name: TestProfileItem TestProfileItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestProfileItem"
    ADD CONSTRAINT "TestProfileItem_pkey" PRIMARY KEY (id);


--
-- Name: TestProfile TestProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestProfile"
    ADD CONSTRAINT "TestProfile_pkey" PRIMARY KEY (id);


--
-- Name: UserFavoriteTest UserFavoriteTest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserFavoriteTest"
    ADD CONSTRAINT "UserFavoriteTest_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AppConfig_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AppConfig_key_key" ON public."AppConfig" USING btree (key);


--
-- Name: Branch_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Branch_code_idx" ON public."Branch" USING btree (code);


--
-- Name: Branch_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Branch_code_key" ON public."Branch" USING btree (code);


--
-- Name: Branch_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Branch_order_idx" ON public."Branch" USING btree ("order");


--
-- Name: DiscountType_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DiscountType_code_idx" ON public."DiscountType" USING btree (code);


--
-- Name: DiscountType_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DiscountType_code_key" ON public."DiscountType" USING btree (code);


--
-- Name: LabOrderItem_referredLabId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabOrderItem_referredLabId_idx" ON public."LabOrderItem" USING btree ("referredLabId");


--
-- Name: LabOrder_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabOrder_branchId_idx" ON public."LabOrder" USING btree ("branchId");


--
-- Name: LabOrder_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabOrder_createdAt_idx" ON public."LabOrder" USING btree ("createdAt");


--
-- Name: LabOrder_orderCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LabOrder_orderCode_key" ON public."LabOrder" USING btree ("orderCode");


--
-- Name: LabOrder_orderSource_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabOrder_orderSource_idx" ON public."LabOrder" USING btree ("orderSource");


--
-- Name: LabOrder_patientType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabOrder_patientType_idx" ON public."LabOrder" USING btree ("patientType");


--
-- Name: LabOrder_priceType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabOrder_priceType_idx" ON public."LabOrder" USING btree ("priceType");


--
-- Name: LabOrder_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabOrder_status_idx" ON public."LabOrder" USING btree (status);


--
-- Name: LabResult_orderItemId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LabResult_orderItemId_key" ON public."LabResult" USING btree ("orderItemId");


--
-- Name: LabResult_validatedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabResult_validatedById_idx" ON public."LabResult" USING btree ("validatedById");


--
-- Name: LabSection_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabSection_code_idx" ON public."LabSection" USING btree (code);


--
-- Name: LabSection_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LabSection_code_key" ON public."LabSection" USING btree (code);


--
-- Name: LabTemplateItemRefRange_templateItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabTemplateItemRefRange_templateItemId_idx" ON public."LabTemplateItemRefRange" USING btree ("templateItemId");


--
-- Name: LabTemplate_labTestId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LabTemplate_labTestId_key" ON public."LabTemplate" USING btree ("labTestId");


--
-- Name: LabTestReferredLab_labTestId_referredLabId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LabTestReferredLab_labTestId_referredLabId_key" ON public."LabTestReferredLab" USING btree ("labTestId", "referredLabId");


--
-- Name: LabTestReferredLab_referredLabId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabTestReferredLab_referredLabId_idx" ON public."LabTestReferredLab" USING btree ("referredLabId");


--
-- Name: LabTest_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LabTest_code_key" ON public."LabTest" USING btree (code);


--
-- Name: LabTest_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabTest_isActive_idx" ON public."LabTest" USING btree ("isActive");


--
-- Name: LabTest_referredLabId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabTest_referredLabId_idx" ON public."LabTest" USING btree ("referredLabId");


--
-- Name: LabTest_sectionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LabTest_sectionId_idx" ON public."LabTest" USING btree ("sectionId");


--
-- Name: NotificationRead_notificationId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NotificationRead_notificationId_userId_key" ON public."NotificationRead" USING btree ("notificationId", "userId");


--
-- Name: NotificationRead_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationRead_userId_idx" ON public."NotificationRead" USING btree ("userId");


--
-- Name: Notification_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_createdAt_idx" ON public."Notification" USING btree ("createdAt");


--
-- Name: Notification_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_type_idx" ON public."Notification" USING btree (type);


--
-- Name: Patient_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Patient_code_idx" ON public."Patient" USING btree (code);


--
-- Name: Patient_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Patient_code_key" ON public."Patient" USING btree (code);


--
-- Name: Patient_dni_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Patient_dni_idx" ON public."Patient" USING btree (dni);


--
-- Name: Patient_dni_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Patient_dni_key" ON public."Patient" USING btree (dni);


--
-- Name: Payment_method_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_method_idx" ON public."Payment" USING btree (method);


--
-- Name: Payment_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_orderId_idx" ON public."Payment" USING btree ("orderId");


--
-- Name: Payment_paidAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_paidAt_idx" ON public."Payment" USING btree ("paidAt");


--
-- Name: PayrollPeriod_year_month_quincena_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollPeriod_year_month_quincena_idx" ON public."PayrollPeriod" USING btree (year, month, quincena);


--
-- Name: PayrollPeriod_year_month_quincena_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PayrollPeriod_year_month_quincena_key" ON public."PayrollPeriod" USING btree (year, month, quincena);


--
-- Name: Payroll_payrollPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payroll_payrollPeriodId_idx" ON public."Payroll" USING btree ("payrollPeriodId");


--
-- Name: Payroll_staffMemberId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payroll_staffMemberId_idx" ON public."Payroll" USING btree ("staffMemberId");


--
-- Name: Payroll_staffMemberId_payrollPeriodId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Payroll_staffMemberId_payrollPeriodId_key" ON public."Payroll" USING btree ("staffMemberId", "payrollPeriodId");


--
-- Name: PreAnalyticNoteTemplate_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PreAnalyticNoteTemplate_code_idx" ON public."PreAnalyticNoteTemplate" USING btree (code);


--
-- Name: PreAnalyticNoteTemplate_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PreAnalyticNoteTemplate_code_key" ON public."PreAnalyticNoteTemplate" USING btree (code);


--
-- Name: PreAnalyticNoteTemplate_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PreAnalyticNoteTemplate_isActive_idx" ON public."PreAnalyticNoteTemplate" USING btree ("isActive");


--
-- Name: ReferredLabPayment_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferredLabPayment_orderId_idx" ON public."ReferredLabPayment" USING btree ("orderId");


--
-- Name: ReferredLabPayment_paidAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferredLabPayment_paidAt_idx" ON public."ReferredLabPayment" USING btree ("paidAt");


--
-- Name: ReferredLabPayment_referredLabId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferredLabPayment_referredLabId_idx" ON public."ReferredLabPayment" USING btree ("referredLabId");


--
-- Name: ReferredLab_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferredLab_isActive_idx" ON public."ReferredLab" USING btree ("isActive");


--
-- Name: Role_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Role_code_idx" ON public."Role" USING btree (code);


--
-- Name: Role_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Role_code_key" ON public."Role" USING btree (code);


--
-- Name: StaffDiscount_periodYear_periodMonth_periodQuincena_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffDiscount_periodYear_periodMonth_periodQuincena_idx" ON public."StaffDiscount" USING btree ("periodYear", "periodMonth", "periodQuincena");


--
-- Name: StaffDiscount_staffMemberId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffDiscount_staffMemberId_idx" ON public."StaffDiscount" USING btree ("staffMemberId");


--
-- Name: StaffMember_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffMember_isActive_idx" ON public."StaffMember" USING btree ("isActive");


--
-- Name: StaffMember_lastName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffMember_lastName_idx" ON public."StaffMember" USING btree ("lastName");


--
-- Name: StaffShiftCount_payrollPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffShiftCount_payrollPeriodId_idx" ON public."StaffShiftCount" USING btree ("payrollPeriodId");


--
-- Name: StaffShiftCount_staffMemberId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffShiftCount_staffMemberId_idx" ON public."StaffShiftCount" USING btree ("staffMemberId");


--
-- Name: StaffShiftCount_staffMemberId_payrollPeriodId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StaffShiftCount_staffMemberId_payrollPeriodId_key" ON public."StaffShiftCount" USING btree ("staffMemberId", "payrollPeriodId");


--
-- Name: StoredImage_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StoredImage_key_idx" ON public."StoredImage" USING btree (key);


--
-- Name: StoredImage_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StoredImage_key_key" ON public."StoredImage" USING btree (key);


--
-- Name: TestProfileItem_profileId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TestProfileItem_profileId_idx" ON public."TestProfileItem" USING btree ("profileId");


--
-- Name: TestProfileItem_profileId_labTestId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TestProfileItem_profileId_labTestId_key" ON public."TestProfileItem" USING btree ("profileId", "labTestId");


--
-- Name: UserFavoriteTest_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserFavoriteTest_userId_idx" ON public."UserFavoriteTest" USING btree ("userId");


--
-- Name: UserFavoriteTest_userId_labTestId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserFavoriteTest_userId_labTestId_key" ON public."UserFavoriteTest" USING btree ("userId", "labTestId");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_roleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_roleId_idx" ON public."User" USING btree ("roleId");


--
-- Name: LabOrderItem LabOrderItem_labTestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabOrderItem"
    ADD CONSTRAINT "LabOrderItem_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES public."LabTest"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LabOrderItem LabOrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabOrderItem"
    ADD CONSTRAINT "LabOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."LabOrder"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LabOrderItem LabOrderItem_referredLabId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabOrderItem"
    ADD CONSTRAINT "LabOrderItem_referredLabId_fkey" FOREIGN KEY ("referredLabId") REFERENCES public."ReferredLab"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LabOrder LabOrder_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabOrder"
    ADD CONSTRAINT "LabOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LabOrder LabOrder_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabOrder"
    ADD CONSTRAINT "LabOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LabResultItem LabResultItem_resultId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabResultItem"
    ADD CONSTRAINT "LabResultItem_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES public."LabResult"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LabResultItem LabResultItem_templateItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabResultItem"
    ADD CONSTRAINT "LabResultItem_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES public."LabTemplateItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LabResult LabResult_orderItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabResult"
    ADD CONSTRAINT "LabResult_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES public."LabOrderItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LabResult LabResult_validatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabResult"
    ADD CONSTRAINT "LabResult_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LabTemplateItemRefRange LabTemplateItemRefRange_templateItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabTemplateItemRefRange"
    ADD CONSTRAINT "LabTemplateItemRefRange_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES public."LabTemplateItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LabTemplateItem LabTemplateItem_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabTemplateItem"
    ADD CONSTRAINT "LabTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."LabTemplate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LabTemplate LabTemplate_labTestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabTemplate"
    ADD CONSTRAINT "LabTemplate_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES public."LabTest"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LabTestReferredLab LabTestReferredLab_labTestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabTestReferredLab"
    ADD CONSTRAINT "LabTestReferredLab_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES public."LabTest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LabTestReferredLab LabTestReferredLab_referredLabId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabTestReferredLab"
    ADD CONSTRAINT "LabTestReferredLab_referredLabId_fkey" FOREIGN KEY ("referredLabId") REFERENCES public."ReferredLab"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LabTest LabTest_referredLabId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabTest"
    ADD CONSTRAINT "LabTest_referredLabId_fkey" FOREIGN KEY ("referredLabId") REFERENCES public."ReferredLab"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LabTest LabTest_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LabTest"
    ADD CONSTRAINT "LabTest_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."LabSection"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NotificationRead NotificationRead_notificationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationRead"
    ADD CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES public."Notification"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NotificationRead NotificationRead_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationRead"
    ADD CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."LabOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payroll Payroll_payrollPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payroll"
    ADD CONSTRAINT "Payroll_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES public."PayrollPeriod"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payroll Payroll_staffMemberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payroll"
    ADD CONSTRAINT "Payroll_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES public."StaffMember"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReferredLabPayment ReferredLabPayment_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferredLabPayment"
    ADD CONSTRAINT "ReferredLabPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."LabOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReferredLabPayment ReferredLabPayment_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferredLabPayment"
    ADD CONSTRAINT "ReferredLabPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ReferredLabPayment ReferredLabPayment_referredLabId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferredLabPayment"
    ADD CONSTRAINT "ReferredLabPayment_referredLabId_fkey" FOREIGN KEY ("referredLabId") REFERENCES public."ReferredLab"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StaffDiscount StaffDiscount_discountTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffDiscount"
    ADD CONSTRAINT "StaffDiscount_discountTypeId_fkey" FOREIGN KEY ("discountTypeId") REFERENCES public."DiscountType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StaffDiscount StaffDiscount_staffMemberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffDiscount"
    ADD CONSTRAINT "StaffDiscount_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES public."StaffMember"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffShiftCount StaffShiftCount_payrollPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffShiftCount"
    ADD CONSTRAINT "StaffShiftCount_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES public."PayrollPeriod"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffShiftCount StaffShiftCount_staffMemberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffShiftCount"
    ADD CONSTRAINT "StaffShiftCount_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES public."StaffMember"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TestProfileItem TestProfileItem_labTestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestProfileItem"
    ADD CONSTRAINT "TestProfileItem_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES public."LabTest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TestProfileItem TestProfileItem_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestProfileItem"
    ADD CONSTRAINT "TestProfileItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."TestProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserFavoriteTest UserFavoriteTest_labTestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserFavoriteTest"
    ADD CONSTRAINT "UserFavoriteTest_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES public."LabTest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserFavoriteTest UserFavoriteTest_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserFavoriteTest"
    ADD CONSTRAINT "UserFavoriteTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict y2x6i3VFwdbRD8yLaozMBvLrhQl1Yb76VEvqBuxLszceoaXh8xV7oTXKAv2VusS

