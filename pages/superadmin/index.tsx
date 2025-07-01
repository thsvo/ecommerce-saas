import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Admin extends User {
  // any additional properties can be defined here
}

const SuperAdminDashboard = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [newAdmin, setNewAdmin] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    subdomain: '',
  });
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for superadmin token
    const token = localStorage.getItem('superadmin_token');
    if (!token) {
      router.push('/superadmin/login');
    } else {
      fetchAdmins();
    }
  }, []);

  const fetchAdmins = async () => {
    const token = localStorage.getItem('superadmin_token');
    const res = await fetch('/api/superadmin/admins', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      setAdmins(data);
    }
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<any>>
  ) => {
    setter((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('superadmin_token');
    const res = await fetch('/api/superadmin/admins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newAdmin),
    });
    if (res.ok) {
      fetchAdmins();
      setNewAdmin({ firstName: '', lastName: '', email: '', password: '', subdomain: '' });
    }
  };

  const handleUpdateAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    const token = localStorage.getItem('superadmin_token');
    const res = await fetch(`/api/superadmin/admins/${editingAdmin.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editingAdmin),
    });
    if (res.ok) {
      fetchAdmins();
      setEditingAdmin(null);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    const token = localStorage.getItem('superadmin_token');
    const res = await fetch(`/api/superadmin/admins/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      fetchAdmins();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superadmin_token');
    router.push('/superadmin/login');
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Superadmin Dashboard</h1>
        <Button onClick={handleLogout}>Logout</Button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Add New Admin</h2>
        <form onSubmit={handleAddAdmin} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={newAdmin.firstName}
                onChange={(e) => handleInputChange(e, setNewAdmin)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={newAdmin.lastName}
                onChange={(e) => handleInputChange(e, setNewAdmin)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={newAdmin.email}
              onChange={(e) => handleInputChange(e, setNewAdmin)}
              required
            />
          </div>
          <div>
            <Label htmlFor="subdomain">Subdomain</Label>
            <Input
              id="subdomain"
              name="subdomain"
              value={newAdmin.subdomain}
              onChange={(e) => handleInputChange(e, setNewAdmin)}
              placeholder="e.g., shop1"
              required
            />
            <p className="text-xs text-gray-500 mt-1">This will create shop at: {newAdmin.subdomain}.codeopx.com</p>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={newAdmin.password}
              onChange={(e) => handleInputChange(e, setNewAdmin)}
              required
            />
          </div>
          <Button type="submit">Add Admin</Button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">All Admins</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Subdomain</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>{`${admin.firstName} ${admin.lastName}`}</TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {admin.subdomain || 'No subdomain'}
                  </span>
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => setEditingAdmin({ ...admin })}
                      >
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Admin</DialogTitle>
                      </DialogHeader>
                      {editingAdmin && (
                        <form
                          onSubmit={handleUpdateAdmin}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="edit-firstName">
                                First Name
                              </Label>
                              <Input
                                id="edit-firstName"
                                name="firstName"
                                value={editingAdmin.firstName}
                                onChange={(e) =>
                                  handleInputChange(e, setEditingAdmin)
                                }
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-lastName">Last Name</Label>
                              <Input
                                id="edit-lastName"
                                name="lastName"
                                value={editingAdmin.lastName}
                                onChange={(e) =>
                                  handleInputChange(e, setEditingAdmin)
                                }
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                              id="edit-email"
                              name="email"
                              type="email"
                              value={editingAdmin.email}
                              onChange={(e) =>
                                handleInputChange(e, setEditingAdmin)
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-subdomain">Subdomain</Label>
                            <Input
                              id="edit-subdomain"
                              name="subdomain"
                              value={editingAdmin.subdomain || ''}
                              onChange={(e) =>
                                handleInputChange(e, setEditingAdmin)
                              }
                              placeholder="e.g., shop1"
                              required
                            />
                            <p className="text-xs text-gray-500 mt-1">Store URL: {editingAdmin.subdomain}.codeopx.com</p>
                          </div>
                          <div>
                            <Label htmlFor="edit-password">
                              New Password (optional)
                            </Label>
                            <Input
                              id="edit-password"
                              name="password"
                              type="password"
                              onChange={(e) =>
                                handleInputChange(e, setEditingAdmin)
                              }
                            />
                          </div>
                          <Button type="submit">Save Changes</Button>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteAdmin(admin.id)}
                    className="ml-2"
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
