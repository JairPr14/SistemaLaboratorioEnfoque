"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil, Users, Shield, UserPlus, Trash2, Stamp, FlaskConical, Plus, Building2, GripVertical, TestTube2 } from "lucide-react";
import Link from "next/link";
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  ADMIN_ROLE_CODE,
  PERMISSION_GESTIONAR_ROLES,
  PERMISSION_GESTIONAR_USUARIOS,
  PERMISSION_GESTIONAR_SEDES,
  PERMISSION_GESTIONAR_SECCIONES,
  PERMISSION_GESTIONAR_PREANALITICOS,
  PERMISSION_GESTIONAR_SELLO,
  PERMISSION_GESTIONAR_CATALOGO,
} from "@/lib/auth";

function hasPermissionClient(
  session: { user?: { roleCode?: string | null; permissions?: string[] } } | null,
  permission: string
): boolean {
  if (!session?.user) return false;
  const perms = session.user.permissions ?? [];
  if (perms.includes(permission)) return true;
  if (session.user.roleCode === ADMIN_ROLE_CODE && perms.length === 0) return true;
  return false;
}

type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: string | null;
  isActive: boolean;
  _count: { users: number };
};

function parseRolePermissions(permissions: string | null): string[] {
  if (!permissions) return [];
  try {
    const parsed = JSON.parse(permissions) as unknown;
    return Array.isArray(parsed) && parsed.every((p) => typeof p === "string") ? parsed : [];
  } catch {
    return [];
  }
}

type User = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  roleId: string | null;
  role: { id: string; code: string; name: string } | null;
};

type Branch = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  order: number;
  isActive: boolean;
};

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleEdit, setRoleEdit] = useState<Role | null>(null);
  const [roleCreate, setRoleCreate] = useState(false);
  const [userEdit, setUserEdit] = useState<User | null>(null);
  const [userCreate, setUserCreate] = useState(false);
  const [branchEdit, setBranchEdit] = useState<Branch | null>(null);
  const [branchCreate, setBranchCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printConfig, setPrintConfig] = useState<{ stampEnabled: boolean; stampImageUrl: string | null } | null>(null);
  const [stampUploading, setStampUploading] = useState(false);

  // Permisos del usuario actual
  const canManageRoles = hasPermissionClient(session, PERMISSION_GESTIONAR_ROLES);
  const canManageUsers = hasPermissionClient(session, PERMISSION_GESTIONAR_USUARIOS);
  const canManageBranches = hasPermissionClient(session, PERMISSION_GESTIONAR_SEDES);
  const canManageSections = hasPermissionClient(session, PERMISSION_GESTIONAR_SECCIONES);
  const canManagePreanalytics = hasPermissionClient(session, PERMISSION_GESTIONAR_PREANALITICOS);
  const canManageStamp = hasPermissionClient(session, PERMISSION_GESTIONAR_SELLO);
  const canManageCatalog = hasPermissionClient(session, PERMISSION_GESTIONAR_CATALOGO);

  const loadRoles = async () => {
    const res = await fetch("/api/roles");
    if (res.ok) {
      const data = await res.json();
      setRoles(data.items ?? []);
    }
  };

  const loadUsers = async () => {
    const res = await fetch("/api/config/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.items ?? []);
    }
  };

  const loadPrintConfig = async () => {
    const res = await fetch("/api/config/print");
    if (res.ok) {
      const data = await res.json();
      setPrintConfig(data);
    }
  };

  const loadBranches = async () => {
    const res = await fetch("/api/config/branches");
    if (res.ok) {
      const data = await res.json();
      setBranches(data ?? []);
    }
  };

  useEffect(() => {
    Promise.all([loadRoles(), loadUsers(), loadPrintConfig(), loadBranches()]).finally(() => setLoading(false));
  }, []);

  const handleSaveRole = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!roleEdit) return;
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem("roleName") as HTMLInputElement).value.trim();
    const description = (form.elements.namedItem("roleDescription") as HTMLInputElement).value.trim() || null;
    const isActive = (form.elements.namedItem("roleActive") as HTMLInputElement).checked;
    const permissions = ALL_PERMISSIONS.filter(
      (p) => (form.elements.namedItem(`rolePerm_${p.code}`) as HTMLInputElement)?.checked,
    ).map((p) => p.code);
    try {
      const res = await fetch(`/api/roles/${roleEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, isActive, permissions }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al guardar");
        return;
      }
      toast.success("Rol actualizado");
      setRoleEdit(null);
      await loadRoles();
    } catch {
      toast.error("No se pudo actualizar el rol");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const code = (form.elements.namedItem("newRoleCode") as HTMLInputElement).value.trim().toUpperCase();
    const name = (form.elements.namedItem("newRoleName") as HTMLInputElement).value.trim();
    const description = (form.elements.namedItem("newRoleDescription") as HTMLInputElement).value.trim() || null;
    const isActive = (form.elements.namedItem("newRoleActive") as HTMLInputElement).checked;
    const permissions = ALL_PERMISSIONS.filter(
      (p) => (form.elements.namedItem(`newRolePerm_${p.code}`) as HTMLInputElement)?.checked,
    ).map((p) => p.code);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, description, isActive, permissions }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al crear el rol");
        return;
      }
      toast.success("Rol creado");
      setRoleCreate(false);
      await loadRoles();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role._count.users > 0) {
      toast.error(`No se puede eliminar el rol. Tiene ${role._count.users} usuario(s) asignado(s)`);
      return;
    }
    if (!confirm(`¿Eliminar el rol "${role.name}" (${role.code})?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al eliminar");
        return;
      }
      toast.success("Rol eliminado");
      await loadRoles();
    } catch {
      toast.error("No se pudo eliminar el rol");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!userEdit) return;
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const roleId = (form.elements.namedItem("userRoleId") as HTMLSelectElement).value || null;
    const isActive = (form.elements.namedItem("userActive") as HTMLInputElement).checked;
    const newPassword = (form.elements.namedItem("userPassword") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("userPasswordConfirm") as HTMLInputElement).value;
    
    // Validar contraseña si se proporciona
    if (newPassword) {
      if (newPassword.length < 6) {
        toast.error("La contraseña debe tener al menos 6 caracteres");
        setSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Las contraseñas no coinciden");
        setSaving(false);
        return;
      }
    }
    
    try {
      const res = await fetch(`/api/config/users/${userEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          roleId, 
          isActive,
          ...(newPassword && { password: newPassword })
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al guardar");
        return;
      }
      toast.success("Usuario actualizado");
      setUserEdit(null);
      await loadUsers();
    } catch {
      toast.error("No se pudo actualizar el usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("newEmail") as HTMLInputElement).value.trim().toLowerCase();
    const password = (form.elements.namedItem("newPassword") as HTMLInputElement).value;
    const name = (form.elements.namedItem("newName") as HTMLInputElement).value.trim() || null;
    const roleId = (form.elements.namedItem("newRoleId") as HTMLSelectElement).value || null;
    try {
      const res = await fetch("/api/config/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, roleId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al crear el usuario");
        return;
      }
      toast.success("Usuario creado");
      setUserCreate(false);
      await loadUsers();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleStampEnabledChange = async (enabled: boolean) => {
    setSaving(true);
    try {
      const res = await fetch("/api/config/print", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stampEnabled: enabled }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const data = await res.json();
      setPrintConfig(data);
      toast.success(enabled ? "Sello activado en PDFs" : "Sello desactivado");
    } catch {
      toast.error("No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStampUploading(true);
    try {
      const formData = new FormData();
      formData.append("stamp", file);
      const res = await fetch("/api/config/print/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir");
      setPrintConfig((prev) => (prev ? { ...prev, stampImageUrl: data.stampImageUrl } : null));
      toast.success("Sello subido correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir el sello");
    } finally {
      setStampUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveStamp = async () => {
    if (!confirm("¿Quitar el sello de los PDFs? Deberá subir uno nuevo para volver a usarlo.")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/config/print", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stampImageUrl: null, stampEnabled: false }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const data = await res.json();
      setPrintConfig(data);
      toast.success("Sello eliminado");
    } catch {
      toast.error("No se pudo eliminar");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`¿Eliminar al usuario ${user.email}? No podrá iniciar sesión.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/config/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      toast.success("Usuario eliminado");
      await loadUsers();
    } catch {
      toast.error("No se pudo eliminar el usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const code = (form.elements.namedItem("newBranchCode") as HTMLInputElement).value.trim().toUpperCase();
    const name = (form.elements.namedItem("newBranchName") as HTMLInputElement).value.trim();
    const address = (form.elements.namedItem("newBranchAddress") as HTMLInputElement).value.trim() || null;
    const phone = (form.elements.namedItem("newBranchPhone") as HTMLInputElement).value.trim() || null;
    const order = parseInt((form.elements.namedItem("newBranchOrder") as HTMLInputElement).value) || 0;
    const isActive = (form.elements.namedItem("newBranchActive") as HTMLInputElement).checked;
    try {
      const res = await fetch("/api/config/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, address, phone, order, isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al crear la sede");
        return;
      }
      toast.success("Sede creada");
      setBranchCreate(false);
      await loadBranches();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!branchEdit) return;
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const code = (form.elements.namedItem("branchCode") as HTMLInputElement).value.trim().toUpperCase();
    const name = (form.elements.namedItem("branchName") as HTMLInputElement).value.trim();
    const address = (form.elements.namedItem("branchAddress") as HTMLInputElement).value.trim() || null;
    const phone = (form.elements.namedItem("branchPhone") as HTMLInputElement).value.trim() || null;
    const order = parseInt((form.elements.namedItem("branchOrder") as HTMLInputElement).value) || 0;
    const isActive = (form.elements.namedItem("branchActive") as HTMLInputElement).checked;
    try {
      const res = await fetch(`/api/config/branches/${branchEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, address, phone, order, isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al guardar");
        return;
      }
      toast.success("Sede actualizada");
      setBranchEdit(null);
      await loadBranches();
    } catch {
      toast.error("No se pudo actualizar la sede");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = async (branch: Branch) => {
    if (!confirm(`¿Eliminar la sede "${branch.name}" (${branch.code})?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/config/branches/${branch.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al eliminar");
        return;
      }
      toast.success("Sede eliminada");
      await loadBranches();
    } catch {
      toast.error("No se pudo eliminar la sede");
    } finally {
      setSaving(false);
    }
  };

  const rolePerms = roleEdit ? parseRolePermissions(roleEdit.permissions) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Configuración</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Roles, usuarios y gestión administrativa
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManagePreanalytics && (
            <Link href="/configuracion/preanaliticos">
              <Button variant="outline" size="sm">
                Gestión de preanalíticos
              </Button>
            </Link>
          )}
          {canManageSections && (
            <Link href="/configuracion/secciones">
              <Button variant="outline" size="sm">
                <FlaskConical className="h-4 w-4 mr-2" />
                Gestión de Secciones
              </Button>
            </Link>
          )}
          {canManageCatalog && (
            <Link href="/configuracion/referred-labs">
              <Button variant="outline" size="sm">
                <TestTube2 className="h-4 w-4 mr-2" />
                Laboratorios referidos
              </Button>
            </Link>
          )}
        </div>
      </div>

      {canManageRoles && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <CardTitle>Roles</CardTitle>
            </div>
            <Button onClick={() => setRoleCreate(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo rol
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-1">
            <Table className="min-w-[540px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Usuarios</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      No hay roles.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.code}</TableCell>
                      <TableCell>{role.name}</TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {role.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.isActive ? "success" : "secondary"}>
                          {role.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>{role._count.users}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRoleEdit(role)}
                            title="Editar rol"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRole(role)}
                            disabled={saving || role._count.users > 0}
                            title={role._count.users > 0 ? "No se puede eliminar: tiene usuarios asignados" : "Eliminar rol"}
                            className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {canManageStamp && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Stamp className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <CardTitle>Sello virtual para PDFs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Incluya un sello o firma digital en cada hoja de los informes de laboratorio exportados a PDF.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="stampEnabled"
                checked={printConfig?.stampEnabled ?? false}
                disabled={!printConfig?.stampImageUrl || saving}
                onChange={(e) => handleStampEnabledChange(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="stampEnabled">
                Incluir sello en los PDFs
              {!printConfig?.stampImageUrl && (
                <span className="ml-2 text-xs text-amber-600">(Suba una imagen primero)</span>
              )}
            </Label>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="stampFile"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleStampUpload}
                disabled={stampUploading}
                className="hidden"
              />
              <Label htmlFor="stampFile" className="cursor-pointer">
                <span
                  className={`inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 ${stampUploading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {stampUploading ? "Subiendo…" : printConfig?.stampImageUrl ? "Cambiar sello" : "Subir sello"}
                </span>
              </Label>
            </div>
            {printConfig?.stampImageUrl && (
              <>
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL dinámica de sello */}
                  <img
                    src={printConfig.stampImageUrl}
                    alt="Vista previa del sello"
                    className="h-16 w-auto max-w-32 object-contain border border-slate-200 rounded"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveStamp}
                  disabled={saving}
                  className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  Quitar sello
                </Button>
              </>
            )}
          </div>
          </CardContent>
        </Card>
      )}

      {canManageUsers && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <CardTitle>Usuarios</CardTitle>
            </div>
            <Button onClick={() => setUserCreate(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo usuario
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-1">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      No hay usuarios.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.name ?? "—"}</TableCell>
                      <TableCell>
                        {user.role ? (
                          <Badge variant="secondary">{user.role.name}</Badge>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Sin rol</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "success" : "secondary"}>
                          {user.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setUserEdit(user)}
                            title="Editar usuario"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user)}
                            disabled={saving}
                            title="Eliminar usuario"
                            className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sección Sedes */}
      {canManageBranches && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <CardTitle>Sedes</CardTitle>
            </div>
            <Button onClick={() => setBranchCreate(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva sede
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-1">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Orden</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-24 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No hay sedes configuradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    branches.map((branch) => (
                      <TableRow key={branch.id}>
                        <TableCell>
                          <div className="flex items-center gap-1 text-slate-400">
                            <GripVertical className="h-4 w-4" />
                            <span className="text-sm">{branch.order}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium font-mono text-xs">
                          {branch.code}
                        </TableCell>
                        <TableCell className="font-medium">{branch.name}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {branch.address ?? "—"}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {branch.phone ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={branch.isActive ? "success" : "secondary"}>
                            {branch.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setBranchEdit(branch)}
                              title="Editar sede"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBranch(branch)}
                              disabled={saving}
                              title="Eliminar sede"
                              className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo nuevo rol */}
      <Dialog open={roleCreate} onOpenChange={(open) => !open && setRoleCreate(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo rol</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newRoleCode">Código</Label>
              <Input
                id="newRoleCode"
                name="newRoleCode"
                placeholder="Ej: ADMIN, LAB, RECEPTION"
                required
                pattern="[A-Z0-9_]+"
                title="Solo letras mayúsculas, números y guiones bajos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newRoleName">Nombre</Label>
              <Input
                id="newRoleName"
                name="newRoleName"
                placeholder="Ej: Administrador"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newRoleDescription">Descripción (opcional)</Label>
              <Input
                id="newRoleDescription"
                name="newRoleDescription"
                placeholder="Ej: Acceso completo al sistema"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Permisos</Label>
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-4 max-h-64 overflow-y-auto dark:border-slate-600 dark:bg-slate-800/50">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2">
                      {group.label}
                    </p>
                    <div className="space-y-2 pl-1">
                      {group.permissions.map((p) => (
                        <div key={p.code} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`newRolePerm_${p.code}`}
                            name={`newRolePerm_${p.code}`}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <Label htmlFor={`newRolePerm_${p.code}`} className="font-normal cursor-pointer text-sm">
                            {p.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="newRoleActive"
                name="newRoleActive"
                defaultChecked={true}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="newRoleActive">Activo</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRoleCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creando..." : "Crear rol"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo editar rol */}
      <Dialog open={!!roleEdit} onOpenChange={(open) => !open && setRoleEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar rol</DialogTitle>
          </DialogHeader>
          {roleEdit && (
            <form onSubmit={handleSaveRole} className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Código: {roleEdit.code}</p>
              <div className="space-y-2">
                <Label htmlFor="roleName">Nombre</Label>
                <Input
                  id="roleName"
                  name="roleName"
                  defaultValue={roleEdit.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleDescription">Descripción</Label>
                <Input
                  id="roleDescription"
                  name="roleDescription"
                  defaultValue={roleEdit.description ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Permisos</Label>
                <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-4 max-h-64 overflow-y-auto dark:border-slate-600 dark:bg-slate-800/50">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2">
                        {group.label}
                      </p>
                      <div className="space-y-2 pl-1">
                        {group.permissions.map((p) => (
                          <div key={p.code} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`rolePerm_${p.code}`}
                              name={`rolePerm_${p.code}`}
                              defaultChecked={rolePerms.includes(p.code)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            <Label htmlFor={`rolePerm_${p.code}`} className="font-normal cursor-pointer text-sm">
                              {p.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="roleActive"
                  name="roleActive"
                  defaultChecked={roleEdit.isActive}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="roleActive">Activo</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setRoleEdit(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo nuevo usuario */}
      <Dialog open={userCreate} onOpenChange={(open) => !open && setUserCreate(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email</Label>
              <Input
                id="newEmail"
                name="newEmail"
                type="email"
                placeholder="usuario@laboratorio.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Contraseña</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newName">Nombre (opcional)</Label>
              <Input
                id="newName"
                name="newName"
                placeholder="Ej: María García"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newRoleId">Rol</Label>
              <select
                id="newRoleId"
                name="newRoleId"
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Sin rol</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setUserCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creando..." : "Crear usuario"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo editar usuario */}
      <Dialog open={!!userEdit} onOpenChange={(open) => !open && setUserEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          {userEdit && (
            <form onSubmit={handleSaveUser} className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{userEdit.email}</p>
              <div className="space-y-2">
                <Label htmlFor="userRoleId">Rol</Label>
                <select
                  id="userRoleId"
                  name="userRoleId"
                  defaultValue={userEdit.roleId ?? ""}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Sin rol</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userPassword">Nueva contraseña (opcional)</Label>
                <Input
                  id="userPassword"
                  name="userPassword"
                  type="password"
                  placeholder="Dejar vacío para no cambiar"
                  minLength={6}
                  className="dark:bg-slate-800"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">Mínimo 6 caracteres</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userPasswordConfirm">Confirmar nueva contraseña</Label>
                <Input
                  id="userPasswordConfirm"
                  name="userPasswordConfirm"
                  type="password"
                  placeholder="Repetir contraseña"
                  minLength={6}
                  className="dark:bg-slate-800"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="userActive"
                  name="userActive"
                  defaultChecked={userEdit.isActive}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="userActive">Activo</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setUserEdit(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo nueva sede */}
      <Dialog open={branchCreate} onOpenChange={(open) => !open && setBranchCreate(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva sede</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBranch} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newBranchCode">Código</Label>
                <Input
                  id="newBranchCode"
                  name="newBranchCode"
                  placeholder="Ej: SEDE_CENTRAL"
                  required
                  pattern="[A-Z0-9_]+"
                  title="Solo letras mayúsculas, números y guiones bajos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newBranchName">Nombre</Label>
                <Input
                  id="newBranchName"
                  name="newBranchName"
                  placeholder="Ej: Sede Central"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newBranchAddress">Dirección (opcional)</Label>
              <Input
                id="newBranchAddress"
                name="newBranchAddress"
                placeholder="Ej: Av. Principal 123"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newBranchPhone">Teléfono (opcional)</Label>
                <Input
                  id="newBranchPhone"
                  name="newBranchPhone"
                  placeholder="Ej: +51 999 999 999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newBranchOrder">Orden</Label>
                <Input
                  id="newBranchOrder"
                  name="newBranchOrder"
                  type="number"
                  defaultValue="0"
                  min="0"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">Menor número = aparece primero</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="newBranchActive"
                name="newBranchActive"
                defaultChecked={true}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="newBranchActive">Activa</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setBranchCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creando..." : "Crear sede"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo editar sede */}
      <Dialog open={!!branchEdit} onOpenChange={(open) => !open && setBranchEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar sede</DialogTitle>
          </DialogHeader>
          {branchEdit && (
            <form onSubmit={handleSaveBranch} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branchCode">Código</Label>
                  <Input
                    id="branchCode"
                    name="branchCode"
                    defaultValue={branchEdit.code}
                    required
                    pattern="[A-Z0-9_]+"
                    title="Solo letras mayúsculas, números y guiones bajos"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchName">Nombre</Label>
                  <Input
                    id="branchName"
                    name="branchName"
                    defaultValue={branchEdit.name}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchAddress">Dirección (opcional)</Label>
                <Input
                  id="branchAddress"
                  name="branchAddress"
                  defaultValue={branchEdit.address ?? ""}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branchPhone">Teléfono (opcional)</Label>
                  <Input
                    id="branchPhone"
                    name="branchPhone"
                    defaultValue={branchEdit.phone ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchOrder">Orden</Label>
                  <Input
                    id="branchOrder"
                    name="branchOrder"
                    type="number"
                    defaultValue={branchEdit.order}
                    min="0"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Menor número = aparece primero</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="branchActive"
                  name="branchActive"
                  defaultChecked={branchEdit.isActive}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="branchActive">Activa</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setBranchEdit(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
