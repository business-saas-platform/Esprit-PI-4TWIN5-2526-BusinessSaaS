import { useEffect, useMemo, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Separator } from "@/app/components/ui/separator";
import {
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Search,
  Users,
  Filter,
  Loader2,
  UserCircle2,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { roleLabels } from "@/app/lib/mockData";
import type { TeamMember } from "@/shared/lib/mockData";
import { TeamMembersApi } from "@/shared/lib/services/teamMembers";
import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { toast } from "sonner";

const ALL_PERMISSIONS = [
  "invoices:read",
  "invoices:write",
  "invoices:update",
  "invoices:delete",
  "expenses:read",
  "expenses:write",
  "expenses:update",
  "expenses:delete",
  "clients:read",
  "clients:write",
  "clients:update",
  "clients:delete",
  "team:read",
  "team:invite",
  "team:remove",
  "reports:read",
  "settings:read",
  "settings:write",
] as const;

type Permission = (typeof ALL_PERMISSIONS)[number];
type RoleType = "business_admin" | "accountant" | "team_member";

const ROLE_PERMISSION_PRESETS: Record<RoleType, Permission[]> = {
  business_admin: [
    "invoices:read",
    "invoices:write",
    "invoices:update",
    "expenses:read",
    "expenses:write",
    "expenses:update",
    "clients:read",
    "clients:write",
    "clients:update",
    "team:read",
    "reports:read",
    "settings:read",
  ],
  accountant: [
    "invoices:read",
    "invoices:write",
    "invoices:update",
    "expenses:read",
    "expenses:write",
    "expenses:update",
    "clients:read",
    "reports:read",
  ],
  team_member: [
    "invoices:read",
    "expenses:read",
    "clients:read",
  ],
};

const PERMISSION_GROUPS: {
  title: string;
  icon: any;
  permissions: Permission[];
}[] = [
  {
    title: "Invoices",
    icon: Briefcase,
    permissions: [
      "invoices:read",
      "invoices:write",
      "invoices:update",
      "invoices:delete",
    ],
  },
  {
    title: "Expenses",
    icon: Briefcase,
    permissions: [
      "expenses:read",
      "expenses:write",
      "expenses:update",
      "expenses:delete",
    ],
  },
  {
    title: "Clients",
    icon: UserCircle2,
    permissions: [
      "clients:read",
      "clients:write",
      "clients:update",
      "clients:delete",
    ],
  },
  {
    title: "Team",
    icon: Users,
    permissions: [
      "team:read",
      "team:invite",
      "team:remove",
    ],
  },
  {
    title: "Reports & Settings",
    icon: Lock,
    permissions: [
      "reports:read",
      "settings:read",
      "settings:write",
    ],
  },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteForm = {
  name: string;
  email: string;
  role: RoleType;
};

type InviteErrors = {
  name?: string;
  email?: string;
  role?: string;
  permissions?: string;
};

export function Team() {
  const { currentBusiness } = useBusinessContext();
  const { user } = useAuth();

  const isOwner = user?.role === "business_owner";

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [newMember, setNewMember] = useState<InviteForm>({
    name: "",
    email: "",
    role: "team_member",
  });

  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(
    ROLE_PERMISSION_PRESETS.team_member
  );

  const [errors, setErrors] = useState<InviteErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const bid = currentBusiness?.id;
    if (!bid) {
      setMembers([]);
      return;
    }

    setLoading(true);
    TeamMembersApi.list(bid)
      .then((res: any) => {
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
          ? res.data
          : res
          ? [res]
          : [];

        setMembers(list);
      })
      .catch(() => {
        setMembers([]);
        toast.error("Erreur", {
          description: "Impossible de charger les membres de l'équipe",
        });
      })
      .finally(() => setLoading(false));
  }, [currentBusiness?.id]);

  const businessMembers = useMemo(() => {
    const bid = currentBusiness?.id;
    if (!bid) return [];
    return (members ?? []).filter((m: any) => m?.businessId === bid);
  }, [members, currentBusiness?.id]);

  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return businessMembers.filter((member: any) => {
      const matchesSearch =
        !term ||
        member?.name?.toLowerCase().includes(term) ||
        member?.email?.toLowerCase().includes(term);

      const matchesRole =
        roleFilter === "all" || member?.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" || member?.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [businessMembers, searchTerm, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = businessMembers.length;
    const active = businessMembers.filter((m: any) => m.status === "active").length;
    const invited = businessMembers.filter((m: any) => m.status === "invited").length;
    const admins = businessMembers.filter((m: any) =>
      ["business_owner", "business_admin"].includes(m.role)
    ).length;

    return { total, active, invited, admins };
  }, [businessMembers]);

  const validateInviteForm = (
    values: InviteForm,
    permissions: Permission[]
  ): InviteErrors => {
    const formErrors: InviteErrors = {};

    if (!values.name.trim()) {
      formErrors.name = "Full name is required";
    } else if (values.name.trim().length < 3) {
      formErrors.name = "Name must contain at least 3 characters";
    } else if (values.name.trim().length > 60) {
      formErrors.name = "Name is too long";
    }

    if (!values.email.trim()) {
      formErrors.email = "Email is required";
    } else if (!emailRegex.test(values.email.trim().toLowerCase())) {
      formErrors.email = "Please enter a valid email address";
    }

    if (!values.role) {
      formErrors.role = "Role is required";
    }

    if (!permissions.length) {
      formErrors.permissions = "Select at least one permission";
    }

    const emailExists = businessMembers.some(
      (member: any) =>
        member?.email?.toLowerCase() === values.email.trim().toLowerCase()
    );

    if (values.email.trim() && emailExists) {
      formErrors.email = "This email already exists in the team";
    }

    return formErrors;
  };

  useEffect(() => {
    const nextErrors = validateInviteForm(newMember, selectedPermissions);
    setErrors(nextErrors);
  }, [newMember, selectedPermissions, businessMembers]);

  const isInviteFormValid = Object.keys(errors).length === 0;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-100 text-green-800 border-green-200",
      invited: "bg-blue-100 text-blue-800 border-blue-200",
      inactive: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return variants[status] || variants.inactive;
  };

  const getPermissionLabel = (permission: string) => {
    return permission
      .replace(":", " • ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const togglePermission = (perm: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
    setTouched((prev) => ({ ...prev, permissions: true }));
  };

  const handleRoleChange = (role: RoleType) => {
    setNewMember((prev) => ({ ...prev, role }));
    setSelectedPermissions(ROLE_PERMISSION_PRESETS[role]);
    setTouched((prev) => ({ ...prev, role: true, permissions: true }));
  };

  const resetInviteForm = () => {
    setNewMember({
      name: "",
      email: "",
      role: "team_member",
    });
    setSelectedPermissions(ROLE_PERMISSION_PRESETS.team_member);
    setErrors({});
    setTouched({});
  };

  const handleInviteMember = async () => {
    try {
      if (!isOwner) {
        toast.error("Accès refusé", {
          description: "Seul le Business Owner peut inviter.",
        });
        return;
      }

      const bid = currentBusiness?.id;
      if (!bid) {
        toast.error("Erreur", {
          description: "Aucune entreprise sélectionnée",
        });
        return;
      }

      const validationErrors = validateInviteForm(newMember, selectedPermissions);
      setErrors(validationErrors);
      setTouched({
        name: true,
        email: true,
        role: true,
        permissions: true,
      });

      if (Object.keys(validationErrors).length > 0) {
        toast.error("Validation", {
          description: "Veuillez corriger les champs du formulaire",
        });
        return;
      }

      const dto: any = {
        businessId: bid,
        name: newMember.name.trim(),
        email: newMember.email.trim().toLowerCase(),
        role: newMember.role,
        status: "invited",
        permissions: selectedPermissions,
        joinedAt: new Date().toISOString(),
      };

      setSubmittingInvite(true);

      const created = await TeamMembersApi.invite(dto);

      setMembers((prev) => [created.teamMember, ...prev]);

      toast.success("Invitation envoyée", {
        description: "L'email d'invitation a été envoyé avec succès.",
      });

      setIsDialogOpen(false);
      resetInviteForm();
    } catch (err: any) {
      toast.error("Erreur invitation", {
        description: err?.message || "Impossible d'inviter ce membre",
      });
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      if (!isOwner) {
        toast.error("Accès refusé", {
          description: "Seul le Business Owner peut supprimer.",
        });
        return;
      }

      setRemovingId(memberId);

      await TeamMembersApi.remove(memberId);

      setMembers((prev) => prev.filter((m) => m.id !== memberId));

      toast.success("Membre supprimé");
    } catch (err: any) {
      toast.error("Erreur suppression", {
        description: err?.message || "Impossible de supprimer ce membre",
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage team members, roles and permissions for your business
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetInviteForm();
          }}
        >
          <DialogTrigger asChild>
            <Button
              disabled={!isOwner || !currentBusiness?.id}
              className="shadow-sm"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <UserPlus className="h-5 w-5" />
                </div>
                Invite Team Member
              </DialogTitle>
              <DialogDescription className="pt-1 text-sm leading-6">
                Create a new invitation and assign the right role and permissions.
                Only the <span className="font-semibold">Business Owner</span> can invite members.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              <Card className="border-0 bg-muted/40 shadow-none">
                <CardContent className="grid gap-5 p-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="member-name">Full Name</Label>
                      <Input
                        id="member-name"
                        placeholder="Ahmed Ben Ali"
                        value={newMember.name}
                        onChange={(e) =>
                          setNewMember((prev) => ({ ...prev, name: e.target.value }))
                        }
                        onBlur={() =>
                          setTouched((prev) => ({ ...prev, name: true }))
                        }
                        className={
                          touched.name && errors.name
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }
                      />
                      {touched.name && errors.name && (
                        <p className="flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="member-email">Email</Label>
                      <Input
                        id="member-email"
                        type="email"
                        placeholder="ahmed@business.tn"
                        value={newMember.email}
                        onChange={(e) =>
                          setNewMember((prev) => ({ ...prev, email: e.target.value }))
                        }
                        onBlur={() =>
                          setTouched((prev) => ({ ...prev, email: true }))
                        }
                        className={
                          touched.email && errors.email
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }
                      />
                      {touched.email && errors.email && (
                        <p className="flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="member-role">Role</Label>
                    <Select
                      value={newMember.role}
                      onValueChange={(value) => handleRoleChange(value as RoleType)}
                    >
                      <SelectTrigger
                        id="member-role"
                        className={
                          touched.role && errors.role
                            ? "border-red-500 focus:ring-red-500"
                            : ""
                        }
                      >
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business_admin">
                          Business Administrator
                        </SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                        <SelectItem value="team_member">Team Member</SelectItem>
                      </SelectContent>
                    </Select>

                    {touched.role && errors.role && (
                      <p className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.role}
                      </p>
                    )}

                    <div className="rounded-xl border bg-white px-4 py-3 text-sm text-muted-foreground">
                      <span className="font-medium text-gray-900">Preset loaded:</span>{" "}
                      permissions are auto-suggested based on the selected role.
                      You can still customize them manually.
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Permissions
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Choose exactly what this member can access
                    </p>
                  </div>

                  <Badge variant="secondary" className="w-fit px-3 py-1 text-xs">
                    {selectedPermissions.length} selected
                  </Badge>
                </div>

                <div className="grid gap-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const Icon = group.icon;
                    return (
                      <Card key={group.title} className="overflow-hidden border shadow-sm">
                        <CardHeader className="bg-muted/30 pb-3">
                          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                              <Icon className="h-4 w-4" />
                            </div>
                            {group.title}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                          {group.permissions.map((perm) => (
                            <label
                              key={perm}
                              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition hover:bg-muted/40 ${
                                selectedPermissions.includes(perm)
                                  ? "border-primary/30 bg-primary/5"
                                  : "border-border bg-white"
                              }`}
                            >
                              <Checkbox
                                checked={selectedPermissions.includes(perm)}
                                onCheckedChange={() => togglePermission(perm)}
                                className="mt-0.5"
                              />
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {getPermissionLabel(perm)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Access control for {perm.split(":")[0]}
                                </p>
                              </div>
                            </label>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {touched.permissions && errors.permissions && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.permissions}
                  </p>
                )}
              </div>

              <Separator />

              <Card className="border-dashed bg-gradient-to-r from-primary/5 to-transparent shadow-none">
                <CardContent className="flex flex-col gap-3 p-4 text-sm">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Invitation summary
                  </div>
                  <div className="grid gap-2 text-muted-foreground sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-gray-900">Name:</span>{" "}
                      {newMember.name.trim() || "-"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Email:</span>{" "}
                      {newMember.email.trim() || "-"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Role:</span>{" "}
                      {roleLabels?.[newMember.role] || newMember.role}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Permissions:</span>{" "}
                      {selectedPermissions.length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>

              <Button
                onClick={handleInviteMember}
                disabled={!isOwner || submittingInvite || !isInviteFormValid}
                className="min-w-[180px]"
              >
                {submittingInvite ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Total Members
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Active</div>
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Invited</div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{stats.invited}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Admins</div>
            <div className="mt-2 text-2xl font-bold text-indigo-600">{stats.admins}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by member name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="w-full lg:w-[220px]">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <Filter className="mr-2 h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="business_admin">Business Admin</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="team_member">Team Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full lg:w-[180px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Team Members ({loading ? "..." : filteredMembers.length})</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Loading team members...
                    </TableCell>
                  </TableRow>
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No team members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-indigo-100 font-medium text-indigo-600">
                              {(member.name || "?")
                                .split(" ")
                                .map((n: string) => n?.[0] || "")
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>

                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-gray-400" />
                          <span>{roleLabels?.[member.role] || member.role}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex max-w-[360px] flex-wrap gap-1">
                          {(member.permissions ?? []).slice(0, 4).map((perm: string) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {getPermissionLabel(perm)}
                            </Badge>
                          ))}
                          {(member.permissions ?? []).length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{member.permissions.length - 4}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={getStatusBadge(member.status)}>
                          {member.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {member.joinedAt
                          ? new Date(member.joinedAt).toLocaleDateString()
                          : "-"}
                      </TableCell>

                      <TableCell className="text-right">
                        {isOwner && member.role !== "business_owner" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={removingId === member.id}
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            {removingId === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}