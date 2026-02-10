"use client";

import { useEffect, useState } from "react";
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
import { Pencil, Users, Shield, UserPlus, Trash2 } from "lucide-react";

type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: { users: number };
};

type User = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  roleId: string | null;
  role: { id: string; code: string; name: string } | null;
};

export default function ConfiguracionPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleEdit, setRoleEdit] = useState<Role | null>(null);
  const [userEdit, setUserEdit] = useState<User | null>(null);
  const [userCreate, setUserCreate] = useState(false);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    Promise.all([loadRoles(), loadUsers()]).finally(() => setLoading(false));
  }, []);

  const handleSaveRole = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!roleEdit) return;
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem("roleName") as HTMLInputElement).value.trim();
    const description = (form.elements.namedItem("roleDescription") as HTMLInputElement).value.trim() || null;
    const isActive = (form.elements.namedItem("roleActive") as HTMLInputElement).checked;
    try {
      const res = await fetch(`/api/roles/${roleEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, isActive }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Rol actualizado");
      setRoleEdit(null);
      await loadRoles();
    } catch {
      toast.error("No se pudo actualizar el rol");
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
    try {
      const res = await fetch(`/api/config/users/${userEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, isActive }),
      });
      if (!res.ok) throw new Error("Error al guardar");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>
        <p className="text-slate-500 mt-1">
          Roles y usuarios del sistema
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Shield className="h-5 w-5 text-slate-600" />
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
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
                  <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                    No hay roles.
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.code}</TableCell>
                    <TableCell>{role.name}</TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">
                      {role.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.isActive ? "success" : "secondary"}>
                        {role.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{role._count.users}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRoleEdit(role)}
                        title="Editar rol"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            <CardTitle>Usuarios</CardTitle>
          </div>
          <Button onClick={() => setUserCreate(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo usuario
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
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
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
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
                        <span className="text-slate-400">Sin rol</span>
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
                          className="text-slate-500 hover:text-red-600"
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
        </CardContent>
      </Card>

      {/* Diálogo editar rol */}
      <Dialog open={!!roleEdit} onOpenChange={(open) => !open && setRoleEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar rol</DialogTitle>
          </DialogHeader>
          {roleEdit && (
            <form onSubmit={handleSaveRole} className="space-y-4">
              <p className="text-sm text-slate-500">Código: {roleEdit.code}</p>
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
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
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
              <p className="text-sm text-slate-500">{userEdit.email}</p>
              <div className="space-y-2">
                <Label htmlFor="userRoleId">Rol</Label>
                <select
                  id="userRoleId"
                  name="userRoleId"
                  defaultValue={userEdit.roleId ?? ""}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
                >
                  <option value="">Sin rol</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
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
    </div>
  );
}
