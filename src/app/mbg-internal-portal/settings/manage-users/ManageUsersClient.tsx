"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@prisma/client";
import { UserPlus, Shield, User as UserIcon, MapPin, Mail, Pencil, X } from "lucide-react";

export default function ManageUsersClient({ initialUsers }: { initialUsers: User[] }) {
  const [formData, setFormData] = useState({
    nama_lengkap: "",
    email: "",
    password: "",
    asal_cabang: "MBG Cabang Pasuruan - Sangar",
    role: "ADMIN",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Edit / Detail Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    nama_lengkap: "",
    email: "",
    password: "",
    role: "ADMIN",
    asal_cabang: "MBG Cabang Pasuruan - Sangar",
  });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ nama_lengkap: "", email: "", password: "", asal_cabang: "MBG Cabang Pasuruan - Sangar", role: "ADMIN" });
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Gagal membuat pengguna");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      nama_lengkap: user.nama_lengkap,
      email: user.email,
      password: "",
      role: user.role,
      asal_cabang: user.asal_cabang || "MBG Cabang Pasuruan - Sangar",
    });
    setEditError("");
  };

  const handleCloseEditModal = () => {
    setSelectedUser(null);
    setEditError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setEditLoading(true);
    setEditError("");

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      if (res.ok) {
        handleCloseEditModal();
        router.refresh();
      } else {
        const data = await res.json();
        setEditError(data.message || "Gagal memperbarui pengguna");
      }
    } catch (err) {
      setEditError("Terjadi kesalahan jaringan");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    if (!window.confirm(`Apakah Anda yakin ingin menghapus pengguna "${selectedUser.nama_lengkap}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    
    setEditLoading(true);
    setEditError("");

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        handleCloseEditModal();
        router.refresh();
      } else {
        const data = await res.json();
        setEditError(data.message || "Gagal menghapus pengguna");
      }
    } catch (err) {
      setEditError("Terjadi kesalahan jaringan");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kelola Pengguna</h1>
        <p className="text-slate-500 mt-1">Tambahkan akun Admin baru untuk berbagai cabang.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Create */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-600" /> Tambah Akun
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Lengkap</label>
              <input
                type="text"
                required
                value={formData.nama_lengkap}
                onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                placeholder="Budi Santoso"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                placeholder="budi@mbg.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <input
                type="text"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Asal Cabang</label>
              <select
                disabled
                value={formData.asal_cabang}
                className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none opacity-80 cursor-not-allowed"
              >
                <option value="MBG Cabang Pasuruan - Sangar">MBG Cabang Pasuruan - Sangar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hak Akses</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="ADMIN">Admin (Kasir/Staff)</option>
                <option value="SUPERADMIN">Superadmin (Pemilik)</option>
              </select>
            </div>

            {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 min-h-[44px] mt-4 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? "Menyimpan..." : "Buat Akun"}
            </button>
          </form>
        </div>

        {/* List Users */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Identitas</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Cabang & Akses</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${user.role === 'SUPERADMIN' ? 'bg-amber-100 text-amber-600' : 'bg-brand-100 text-brand-600'}`}>
                          {user.role === 'SUPERADMIN' ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{user.nama_lengkap}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3"/> {user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${user.role === 'SUPERADMIN' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {user.role}
                        </span>
                        <div className="text-xs font-semibold text-slate-600 flex items-center gap-1"><MapPin className="w-3 h-3"/> {user.asal_cabang}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors border border-blue-100 min-h-[44px]"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Detail/Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Account Details & Edit/Delete Pop-up Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl max-w-md w-full relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
            <button
              onClick={handleCloseEditModal}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">Detail & Edit Akun</h3>
            <p className="text-slate-500 text-xs mb-6">Ubah informasi akun dan hak akses pengguna ini.</p>

            <form onSubmit={handleEditSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editFormData.nama_lengkap}
                  onChange={(e) => setEditFormData({ ...editFormData, nama_lengkap: e.target.value })}
                  className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  placeholder="Budi Santoso"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  placeholder="budi@mbg.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password Baru</label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  placeholder="Ketik untuk mengubah password baru"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Asal Cabang</label>
                <select
                  disabled
                  value={editFormData.asal_cabang}
                  className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none opacity-80 cursor-not-allowed"
                >
                  <option value="MBG Cabang Pasuruan - Sangar">MBG Cabang Pasuruan - Sangar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hak Akses</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="ADMIN">Admin (Kasir/Staff)</option>
                  <option value="SUPERADMIN">Superadmin (Pemilik)</option>
                </select>
              </div>

              {editError && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg">{editError}</p>}

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="flex-1 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all text-sm flex items-center justify-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-brand-600 text-white hover:bg-brand-700 font-bold transition-all text-sm disabled:opacity-50 flex items-center justify-center"
                  >
                    {editLoading ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={editLoading}
                  onClick={handleDeleteUser}
                  className="w-full py-2.5 min-h-[44px] rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold transition-all text-sm disabled:opacity-50 flex items-center justify-center"
                >
                  Hapus Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
