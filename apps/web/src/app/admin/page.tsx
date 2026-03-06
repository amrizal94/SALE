'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────
type Location = { id: number; name: string; code: string; address?: string; isActive: boolean; voiceEnabled: boolean }
type Service  = { id: number; locationId: number; name: string; code: string; prefix: string; dailyLimit: number; estimatedMinutes: number; isActive: boolean }
type Counter  = { id: number; locationId: number; name: string; code: string; serviceIds: number[]; isActive: boolean; voiceEnabled: boolean }
type User     = { id: number; username: string; name: string; role: string; locationId?: number; counterId?: number; isActive: boolean; location?: { id: number; name: string }; counter?: { id: number; name: string } }

type Tab = 'dashboard' | 'locations' | 'services' | 'counters' | 'users'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin_location: 'Admin Lokasi',
  officer: 'Petugas',
  kiosk: 'Kiosk',
  display: 'Display',
}

// ── Modal wrapper ──────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

const inputCls = 'w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm'
const selectCls = 'w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm'

// ── Locations Tab ──────────────────────────────────────────────────────
function LocationsTab() {
  const [data, setData] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; item?: Location }>(null)
  const [form, setForm] = useState({ name: '', code: '', address: '', voiceEnabled: true, isActive: true })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.locations.list().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm({ name: '', code: '', address: '', voiceEnabled: true, isActive: true })
    setErr('')
    setModal({ mode: 'create' })
  }

  function openEdit(item: Location) {
    setForm({ name: item.name, code: item.code, address: item.address ?? '', voiceEnabled: item.voiceEnabled, isActive: item.isActive })
    setErr('')
    setModal({ mode: 'edit', item })
  }

  async function save() {
    setSaving(true)
    setErr('')
    try {
      const payload = { name: form.name, code: form.code.toUpperCase(), address: form.address || undefined, voiceEnabled: form.voiceEnabled, isActive: form.isActive }
      if (modal?.mode === 'edit' && modal.item) {
        await api.locations.update(modal.item.id, payload)
      } else {
        await api.locations.create(payload)
      }
      setModal(null)
      load()
    } catch (e: any) {
      setErr(e.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-500 py-8 text-center">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Lokasi</h1>
        <button onClick={openCreate} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          + Tambah Lokasi
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden">
        {data.length === 0 ? (
          <div className="p-8 text-center text-gray-600">Belum ada lokasi</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Nama</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Kode</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Alamat</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-t border-gray-800 hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-white font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono">{row.code}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{row.address ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${row.isActive ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                      {row.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(row)} className="text-purple-400 hover:text-purple-300 text-xs font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Tambah Lokasi' : 'Edit Lokasi'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Nama Lokasi">
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="cth: Satlantas Polres Jakarta Selatan" />
            </Field>
            <Field label="Kode Lokasi">
              <input className={inputCls} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="cth: JKTS-01" />
            </Field>
            <Field label="Alamat (opsional)">
              <textarea className={inputCls} rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="cth: Jl. Buncit Raya No. 209" />
            </Field>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.voiceEnabled} onChange={(e) => setForm((f) => ({ ...f, voiceEnabled: e.target.checked }))} className="rounded" />
                Suara aktif
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                Lokasi aktif
              </label>
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Batal</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Services Tab ───────────────────────────────────────────────────────
function ServicesTab() {
  const [data, setData] = useState<Service[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; item?: Service }>(null)
  const [form, setForm] = useState({ locationId: '', name: '', code: '', prefix: '', dailyLimit: '200', estimatedMinutes: '5' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([api.services.list(), api.locations.list()])
      .then(([svcs, locs]) => { setData(svcs); setLocations(locs) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm({ locationId: locations[0]?.id.toString() ?? '', name: '', code: '', prefix: '', dailyLimit: '200', estimatedMinutes: '5' })
    setErr('')
    setModal({ mode: 'create' })
  }

  function openEdit(item: Service) {
    setForm({ locationId: item.locationId.toString(), name: item.name, code: item.code, prefix: item.prefix, dailyLimit: item.dailyLimit.toString(), estimatedMinutes: item.estimatedMinutes.toString() })
    setErr('')
    setModal({ mode: 'edit', item })
  }

  async function save() {
    setSaving(true)
    setErr('')
    try {
      const payload = { locationId: parseInt(form.locationId), name: form.name, code: form.code.toUpperCase(), prefix: form.prefix.toUpperCase(), dailyLimit: parseInt(form.dailyLimit), estimatedMinutes: parseInt(form.estimatedMinutes) }
      if (modal?.mode === 'edit' && modal.item) {
        await api.services.update(modal.item.id, payload)
      } else {
        await api.services.create(payload)
      }
      setModal(null)
      load()
    } catch (e: any) {
      setErr(e.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    if (!confirm('Hapus layanan ini?')) return
    try {
      await api.services.delete(id)
      load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const locName = (id: number) => locations.find((l) => l.id === id)?.name ?? `Lokasi #${id}`

  if (loading) return <div className="text-gray-500 py-8 text-center">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Layanan</h1>
        <button onClick={openCreate} disabled={locations.length === 0} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          + Tambah Layanan
        </button>
      </div>

      {locations.length === 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 rounded-xl px-4 py-3 text-sm mb-4">
          Tambah lokasi terlebih dahulu sebelum menambah layanan.
        </div>
      )}

      <div className="bg-gray-900 rounded-xl overflow-hidden">
        {data.length === 0 ? (
          <div className="p-8 text-center text-gray-600">Belum ada layanan</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Nama</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Prefix</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Lokasi</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Limit/Estimasi</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-t border-gray-800 hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-white font-medium">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-900 text-blue-300 font-mono text-xs px-2 py-1 rounded">{row.prefix}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{locName(row.locationId)}</td>
                  <td className="px-4 py-3 text-gray-400">{row.dailyLimit} / {row.estimatedMinutes} mnt</td>
                  <td className="px-4 py-3 text-right flex gap-3 justify-end">
                    <button onClick={() => openEdit(row)} className="text-purple-400 hover:text-purple-300 text-xs font-medium">Edit</button>
                    <button onClick={() => remove(row.id)} className="text-red-500 hover:text-red-400 text-xs font-medium">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Tambah Layanan' : 'Edit Layanan'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Lokasi">
              <select className={selectCls} value={form.locationId} onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nama Layanan">
                <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="cth: Verifikasi Dokumen" />
              </Field>
              <Field label="Kode">
                <input className={inputCls} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="cth: VERIF" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Prefix Nomor">
                <input className={inputCls} value={form.prefix} onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))} placeholder="cth: A" maxLength={5} />
              </Field>
              <Field label="Limit Harian">
                <input type="number" className={inputCls} value={form.dailyLimit} onChange={(e) => setForm((f) => ({ ...f, dailyLimit: e.target.value }))} min={1} />
              </Field>
              <Field label="Estimasi (menit)">
                <input type="number" className={inputCls} value={form.estimatedMinutes} onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: e.target.value }))} min={1} />
              </Field>
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Batal</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Counters Tab ───────────────────────────────────────────────────────
function CountersTab() {
  const [data, setData] = useState<Counter[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [allServices, setAllServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; item?: Counter }>(null)
  const [form, setForm] = useState({ locationId: '', name: '', code: '', serviceIds: [] as number[], voiceEnabled: true })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([api.counters.list(), api.locations.list(), api.services.list()])
      .then(([ctrs, locs, svcs]) => { setData(ctrs); setLocations(locs); setAllServices(svcs) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const servicesForLocation = (locId: string) => allServices.filter((s) => s.locationId === parseInt(locId))

  function openCreate() {
    const locId = locations[0]?.id.toString() ?? ''
    setForm({ locationId: locId, name: '', code: '', serviceIds: [], voiceEnabled: true })
    setErr('')
    setModal({ mode: 'create' })
  }

  function openEdit(item: Counter) {
    setForm({ locationId: item.locationId.toString(), name: item.name, code: item.code, serviceIds: item.serviceIds, voiceEnabled: item.voiceEnabled })
    setErr('')
    setModal({ mode: 'edit', item })
  }

  function toggleService(id: number) {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s) => s !== id) : [...f.serviceIds, id],
    }))
  }

  async function save() {
    if (form.serviceIds.length === 0) { setErr('Pilih minimal satu layanan'); return }
    setSaving(true)
    setErr('')
    try {
      const payload = { locationId: parseInt(form.locationId), name: form.name, code: form.code.toUpperCase(), serviceIds: form.serviceIds, voiceEnabled: form.voiceEnabled }
      if (modal?.mode === 'edit' && modal.item) {
        await api.counters.update(modal.item.id, payload)
      } else {
        await api.counters.create(payload)
      }
      setModal(null)
      load()
    } catch (e: any) {
      setErr(e.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const locName = (id: number) => locations.find((l) => l.id === id)?.name ?? `Lokasi #${id}`
  const svcNames = (ids: number[]) => ids.map((id) => allServices.find((s) => s.id === id)?.prefix ?? id).join(', ')

  if (loading) return <div className="text-gray-500 py-8 text-center">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Loket</h1>
        <button onClick={openCreate} disabled={locations.length === 0} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          + Tambah Loket
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden">
        {data.length === 0 ? (
          <div className="p-8 text-center text-gray-600">Belum ada loket</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Nama</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Kode</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Lokasi</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Layanan</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-t border-gray-800 hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-white font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono">{row.code}</td>
                  <td className="px-4 py-3 text-gray-400">{locName(row.locationId)}</td>
                  <td className="px-4 py-3 text-gray-400">{svcNames(row.serviceIds)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(row)} className="text-purple-400 hover:text-purple-300 text-xs font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Tambah Loket' : 'Edit Loket'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Lokasi">
              <select className={selectCls} value={form.locationId} onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value, serviceIds: [] }))}>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nama Loket">
                <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="cth: Loket Verifikasi 1" />
              </Field>
              <Field label="Kode Loket">
                <input className={inputCls} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="cth: L01" />
              </Field>
            </div>
            <Field label="Layanan yang dilayani" error={err && form.serviceIds.length === 0 ? err : undefined}>
              <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                {servicesForLocation(form.locationId).length === 0 ? (
                  <p className="text-gray-500 text-xs">Tidak ada layanan untuk lokasi ini</p>
                ) : (
                  servicesForLocation(form.locationId).map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input type="checkbox" checked={form.serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                      <span className="bg-blue-900 text-blue-300 font-mono text-xs px-1.5 py-0.5 rounded mr-1">{s.prefix}</span>
                      {s.name}
                    </label>
                  ))
                )}
              </div>
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.voiceEnabled} onChange={(e) => setForm((f) => ({ ...f, voiceEnabled: e.target.checked }))} />
              Suara aktif
            </label>
            {err && form.serviceIds.length > 0 && <p className="text-red-400 text-sm">{err}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Batal</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Users Tab ──────────────────────────────────────────────────────────
function UsersTab() {
  const [data, setData] = useState<User[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [allCounters, setAllCounters] = useState<Counter[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; item?: User }>(null)
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'officer', locationId: '', counterId: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([api.users.list(), api.locations.list(), api.counters.list()])
      .then(([usrs, locs, ctrs]) => { setData(usrs); setLocations(locs); setAllCounters(ctrs) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const countersForLocation = (locId: string) => allCounters.filter((c) => c.locationId === parseInt(locId))

  function openCreate() {
    setForm({ username: '', password: '', name: '', role: 'officer', locationId: '', counterId: '' })
    setErr('')
    setModal({ mode: 'create' })
  }

  function openEdit(item: User) {
    setForm({ username: item.username, password: '', name: item.name, role: item.role, locationId: item.locationId?.toString() ?? '', counterId: item.counterId?.toString() ?? '' })
    setErr('')
    setModal({ mode: 'edit', item })
  }

  async function save() {
    setSaving(true)
    setErr('')
    try {
      const payload: any = {
        username: form.username,
        name: form.name,
        role: form.role,
        locationId: form.locationId ? parseInt(form.locationId) : undefined,
        counterId: form.counterId ? parseInt(form.counterId) : undefined,
      }
      if (modal?.mode === 'create' || form.password) {
        payload.password = form.password
      }
      if (modal?.mode === 'edit' && modal.item) {
        await api.users.update(modal.item.id, payload)
      } else {
        await api.users.create(payload)
      }
      setModal(null)
      load()
    } catch (e: any) {
      setErr(e.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-500 py-8 text-center">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pengguna</h1>
        <button onClick={openCreate} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          + Tambah Pengguna
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden">
        {data.length === 0 ? (
          <div className="p-8 text-center text-gray-600">Belum ada pengguna</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Nama</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Username</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Role</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Lokasi / Loket</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-t border-gray-800 hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-white font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono">{row.username}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded-full">{ROLE_LABELS[row.role] ?? row.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {row.location?.name ?? '—'}
                    {row.counter && <span className="ml-1 text-gray-600">/ {row.counter.name}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${row.isActive ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                      {row.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(row)} className="text-purple-400 hover:text-purple-300 text-xs font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Tambah Pengguna' : 'Edit Pengguna'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nama Lengkap">
                <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="cth: Budi Santoso" />
              </Field>
              <Field label="Username">
                <input className={inputCls} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="cth: petugas.l01" />
              </Field>
            </div>
            <Field label={modal.mode === 'edit' ? 'Password baru (kosongkan jika tidak ganti)' : 'Password (min 8 karakter)'}>
              <input type="password" className={inputCls} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </Field>
            <Field label="Role">
              <select className={selectCls} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, counterId: '' }))}>
                {Object.entries(ROLE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </Field>
            {form.role !== 'super_admin' && (
              <Field label="Lokasi">
                <select className={selectCls} value={form.locationId} onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value, counterId: '' }))}>
                  <option value="">— Pilih Lokasi —</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
            )}
            {form.role === 'officer' && form.locationId && (
              <Field label="Loket">
                <select className={selectCls} value={form.counterId} onChange={(e) => setForm((f) => ({ ...f, counterId: e.target.value }))}>
                  <option value="">— Pilih Loket —</option>
                  {countersForLocation(form.locationId).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </Field>
            )}
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Batal</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Dashboard Tab ──────────────────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState({ locations: 0, services: 0, counters: 0, users: 0 })

  useEffect(() => {
    Promise.all([
      api.locations.list(),
      api.services.list(),
      api.counters.list(),
      api.users.list(),
    ]).then(([locs, svcs, ctrs, usrs]) => {
      setStats({ locations: locs.length, services: svcs.length, counters: ctrs.length, users: usrs.length })
    }).catch(() => {})
  }, [])

  const cards = [
    { label: 'Lokasi', value: stats.locations, color: 'bg-blue-900' },
    { label: 'Layanan', value: stats.services, color: 'bg-green-900' },
    { label: 'Loket', value: stats.counters, color: 'bg-orange-900' },
    { label: 'Pengguna', value: stats.users, color: 'bg-purple-900' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className={`${c.color} rounded-xl p-6`}>
            <div className="text-gray-300 text-sm">{c.label}</div>
            <div className="text-4xl font-black mt-2">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-gray-900 rounded-xl p-6 text-gray-400 text-sm space-y-1">
        <p className="font-semibold text-white mb-2">Panduan pengaturan awal:</p>
        <p>1. Tambah <strong className="text-white">Lokasi</strong> terlebih dahulu</p>
        <p>2. Tambah <strong className="text-white">Layanan</strong> untuk setiap lokasi (tentukan prefix, misal A, B, C)</p>
        <p>3. Tambah <strong className="text-white">Loket</strong> dan assign layanan yang dilayani</p>
        <p>4. Tambah <strong className="text-white">Pengguna</strong> — officer wajib di-assign ke loket</p>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('sale_token')
    if (token) {
      api.auth.me().then(setUser).catch(() => {})
    }
  }, [])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    try {
      const { token, user } = await api.auth.login(loginForm.username, loginForm.password)
      localStorage.setItem('sale_token', token)
      setUser(user)
    } catch (err: any) {
      setLoginError(err.message ?? 'Login gagal')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <form onSubmit={login} className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <h1 className="text-white text-2xl font-bold mb-1">Admin SALE</h1>
          <p className="text-gray-400 text-sm mb-6">Masuk sebagai administrator</p>
          {loginError && (
            <div className="bg-red-900/50 text-red-300 rounded-lg px-4 py-3 text-sm mb-4">{loginError}</div>
          )}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-3 font-semibold transition-colors"
            >
              Masuk
            </button>
          </div>
        </form>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'locations', label: 'Lokasi' },
    { id: 'services', label: 'Layanan' },
    { id: 'counters', label: 'Loket' },
    { id: 'users', label: 'Pengguna' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <aside className="w-56 bg-gray-900 flex flex-col py-6 px-3 gap-1 shrink-0">
        <div className="px-3 mb-6">
          <div className="font-bold text-purple-400 text-lg">SALE Admin</div>
          <div className="text-gray-500 text-sm truncate">{user.name}</div>
        </div>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-purple-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => { localStorage.removeItem('sale_token'); setUser(null) }}
          className="text-left px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-red-400 transition-colors"
        >
          Keluar
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'locations' && <LocationsTab />}
        {tab === 'services' && <ServicesTab />}
        {tab === 'counters' && <CountersTab />}
        {tab === 'users' && <UsersTab />}
      </main>
    </div>
  )
}
