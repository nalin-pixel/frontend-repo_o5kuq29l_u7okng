import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || ''

function currency(n) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n || 0)
}

function useFetch(url, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const run = async () => {
    if (!url) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    let active = true
    ;(async () => {
      if (!url) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(url)
        const json = await res.json()
        if (active) setData(json)
      } catch (e) {
        if (active) setError(String(e))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, deps)
  return { data, loading, error, refetch: run, setData }
}

function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 dark:text-slate-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">✕</button>
        {children}
      </div>
    </div>
  )
}

function AddExpense({ categories, onCreated }) {
  const [form, setForm] = useState({ amount: '', category_id: '', description: '', payment_method: 'other', date: new Date().toISOString().slice(0,16), attachment_url: '' })
  const submit = async (e) => {
    e.preventDefault()
    const payload = {
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
      description: form.description || null,
      payment_method: form.payment_method,
      date: new Date(form.date).toISOString(),
      attachment_url: form.attachment_url || null,
    }
    const res = await fetch(`${API_BASE}/api/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    onCreated?.(json)
    setForm({ amount: '', category_id: '', description: '', payment_method: 'other', date: new Date().toISOString().slice(0,16), attachment_url: '' })
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
      <input value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} required type="number" step="0.01" placeholder="Amount" className="border rounded px-3 py-2 bg-white/70 dark:bg-slate-800" />
      <select value={form.category_id} onChange={e=>setForm(f=>({...f, category_id:e.target.value}))} className="border rounded px-3 py-2 bg-white/70 dark:bg-slate-800">
        <option value="">Category</option>
        {categories?.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} placeholder="Description" className="border rounded px-3 py-2 bg-white/70 dark:bg-slate-800" />
      <select value={form.payment_method} onChange={e=>setForm(f=>({...f, payment_method:e.target.value}))} className="border rounded px-3 py-2 bg-white/70 dark:bg-slate-800">
        <option>cash</option>
        <option>card</option>
        <option>bank</option>
        <option>wallet</option>
        <option>other</option>
      </select>
      <input value={form.date} onChange={e=>setForm(f=>({...f, date:e.target.value}))} type="datetime-local" className="border rounded px-3 py-2 bg-white/70 dark:bg-slate-800" />
      <input value={form.attachment_url} onChange={e=>setForm(f=>({...f, attachment_url:e.target.value}))} placeholder="Receipt URL (optional)" className="border rounded px-3 py-2 bg-white/70 dark:bg-slate-800" />
      <button className="md:col-span-6 bg-blue-600 text-white rounded py-2 hover:bg-blue-700 transition">Add Expense</button>
    </form>
  )
}

function ExpenseDetails({ open, onClose, expense, categories, onSaved, onDeleted }) {
  const [form, setForm] = useState(null)
  useEffect(()=>{
    setForm(expense ? { ...expense, date: expense?.date ? new Date(expense.date).toISOString().slice(0,16) : new Date().toISOString().slice(0,16) } : null)
  }, [expense])
  if (!expense || !form) return <Modal open={open} onClose={onClose}><div className="text-center py-6">Loading...</div></Modal>

  const save = async () => {
    const payload = {
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
      description: form.description || null,
      payment_method: form.payment_method,
      date: new Date(form.date).toISOString(),
      attachment_url: form.attachment_url || null,
    }
    const res = await fetch(`${API_BASE}/api/expenses/${expense.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) onSaved?.()
  }
  const del = async () => {
    if (!confirm('Delete this expense?')) return
    const res = await fetch(`${API_BASE}/api/expenses/${expense.id}`, { method: 'DELETE' })
    if (res.ok) onDeleted?.()
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Expense Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="text-sm text-slate-500">Amount</div>
            <input value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} type="number" step="0.01" className="w-full border rounded px-3 py-2 bg-white/70 dark:bg-slate-800" />
          </label>
          <label className="space-y-1">
            <div className="text-sm text-slate-500">Category</div>
            <select value={form.category_id || ''} onChange={e=>setForm(f=>({...f, category_id:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white/70 dark:bg-slate-800">
              <option value="">Uncategorized</option>
              {categories?.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <div className="text-sm text-slate-500">Description</div>
            <input value={form.description || ''} onChange={e=>setForm(f=>({...f, description:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white/70 dark:bg-slate-800" />
          </label>
          <label className="space-y-1">
            <div className="text-sm text-slate-500">Payment Method</div>
            <select value={form.payment_method} onChange={e=>setForm(f=>({...f, payment_method:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white/70 dark:bg-slate-800">
              <option>cash</option>
              <option>card</option>
              <option>bank</option>
              <option>wallet</option>
              <option>other</option>
            </select>
          </label>
          <label className="space-y-1">
            <div className="text-sm text-slate-500">Date</div>
            <input value={form.date} onChange={e=>setForm(f=>({...f, date:e.target.value}))} type="datetime-local" className="w-full border rounded px-3 py-2 bg-white/70 dark:bg-slate-800" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <div className="text-sm text-slate-500">Receipt URL</div>
            <input value={form.attachment_url || ''} onChange={e=>setForm(f=>({...f, attachment_url:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white/70 dark:bg-slate-800" />
          </label>
        </div>

        {form.attachment_url ? (
          <div className="border rounded p-3">
            <div className="text-sm text-slate-500 mb-2">Receipt Preview</div>
            {/* naive check for image */}
            {/(jpg|jpeg|png|gif|webp)$/i.test(form.attachment_url) ? (
              <img src={form.attachment_url} alt="receipt" className="max-h-80 object-contain mx-auto" />
            ) : (
              <a href={form.attachment_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Open attachment</a>
            )}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <button onClick={del} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
          <div className="space-x-2">
            <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
            <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function ExportControls({ filters, data }) {
  const exportCSV = () => {
    const rows = data || []
    const header = ['id','date','amount','description','category_id','payment_method','attachment_url']
    const csv = [header.join(','), ...rows.map(r=>[
      r.id,
      r.date,
      r.amount,
      JSON.stringify(r.description || ''),
      r.category_id || '',
      r.payment_method || '',
      r.attachment_url || ''
    ].join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'expenses.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  const exportPDF = () => {
    window.print()
  }
  return (
    <div className="flex items-center gap-2">
      <button onClick={exportCSV} className="px-3 py-1.5 rounded border bg-white dark:bg-slate-800">Export CSV</button>
      <button onClick={exportPDF} className="px-3 py-1.5 rounded border bg-white dark:bg-slate-800">Export PDF</button>
    </div>
  )
}

function Filters({ categories, value, onChange }) {
  const set = (k,v)=> onChange({ ...value, [k]: v })
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <input value={value.q} onChange={e=>set('q', e.target.value)} placeholder="Search description" className="border rounded px-3 py-2 bg-white/70 dark:bg-slate-800" />
      <select value={value.category_id} onChange={e=>set('category_id', e.target.value)} className="border rounded px-3 py-2 bg-white/70 dark:bg-slate-800">
        <option value="">All categories</option>
        {categories?.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={value.payment_method} onChange={e=>set('payment_method', e.target.value)} className="border rounded px-3 py-2 bg-white/70 dark:bg-slate-800">
        <option value="">Any payment</option>
        <option>cash</option>
        <option>card</option>
        <option>bank</option>
        <option>wallet</option>
        <option>other</option>
      </select>
      <input type="date" value={value.date_from} onChange={e=>set('date_from', e.target.value)} className="border rounded px-3 py-2 bg-white/70 dark:bg-slate-800" />
      <input type="date" value={value.date_to} onChange={e=>set('date_to', e.target.value)} className="border rounded px-3 py-2 bg-white/70 dark:bg-slate-800" />
    </div>
  )
}

function BudgetPanel({ categories }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0,7))
  const { data: budget, setData: setBudget, refetch } = useFetch(`${API_BASE}/api/budgets/${month}`, [month])
  const { data: usage, refetch: refetchUsage } = useFetch(`${API_BASE}/api/budgets/${month}/usage`, [month])

  useEffect(()=>{ /* ensure object shape */ if (!budget) setBudget({ month, amount: 0, per_category: {} }) }, [budget])

  const save = async () => {
    const payload = { month, amount: Number(budget?.amount || 0), per_category: budget?.per_category || {} }
    const res = await fetch(`${API_BASE}/api/budgets/${month}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { await refetch(); await refetchUsage() }
  }

  const total = usage?.total || 0
  const limit = Number(budget?.amount || 0)
  const pct = limit ? Math.min(100, Math.round(total / limit * 100)) : 0
  const alertColor = pct >= 100 ? 'bg-red-600' : pct >= 80 ? 'bg-amber-500' : pct >= 50 ? 'bg-green-500' : 'bg-blue-500'

  const setCategoryLimit = (id, val) => {
    const copy = { ...(budget?.per_category || {}) }
    if (val === '' || isNaN(Number(val))) delete copy[id]
    else copy[id] = Number(val)
    setBudget(b => ({ ...(b || { month, amount: 0, per_category: {} }), per_category: copy }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="font-semibold">Budget</h2>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="border rounded px-3 py-1.5 bg-white/70 dark:bg-slate-800" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="text-slate-500">Monthly Limit</div>
          <div className="flex items-center gap-2 mt-2">
            <input type="number" value={budget?.amount || ''} onChange={e=>setBudget(b=>({ ...(b||{month}), amount: e.target.value }))} className="border rounded px-3 py-2 w-full bg-white/70 dark:bg-slate-800" />
            <button onClick={save} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Used</span>
              <span>{currency(total)} / {currency(limit)} ({pct}%)</span>
            </div>
            <div className="h-2 bg-slate-200 rounded mt-2">
              <div className={`h-2 rounded ${alertColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="text-slate-500 mb-2">Per-Category Limits (optional)</div>
          <div className="grid md:grid-cols-2 gap-3 max-h-64 overflow-auto pr-2">
            {categories?.map(c => (
              <label key={c.id} className="flex items-center gap-2">
                <span className="w-40 truncate">{c.name}</span>
                <input type="number" placeholder="$" value={budget?.per_category?.[c.id] ?? ''} onChange={e=>setCategoryLimit(c.id, e.target.value)} className="border rounded px-2 py-1 w-full bg-white/70 dark:bg-slate-800" />
              </label>
            ))}
          </div>
        </div>
      </div>

      {usage?.per_category?.length ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <h3 className="font-medium mb-3">Usage by Category</h3>
          <div className="space-y-2">
            {usage.per_category.map(u => {
              const limitC = budget?.per_category?.[u.category_id] || 0
              const pctC = limitC ? Math.min(100, Math.round(u.total / limitC * 100)) : 0
              const color = pctC >= 100 ? 'bg-red-600' : pctC >= 80 ? 'bg-amber-500' : pctC >= 50 ? 'bg-green-500' : 'bg-blue-500'
              return (
                <div key={u.category_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{u.category_name || 'Uncategorized'}</span>
                    <span>{currency(u.total)}{limitC ? ` / ${currency(limitC)} (${pctC}%)` : ''}</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded">
                    <div className={`h-2 rounded ${color}`} style={{ width: `${pctC}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Dashboard() {
  const [period, setPeriod] = useState('month')
  const [dark, setDark] = useState(() => (localStorage.getItem('theme') || 'light') === 'dark')
  useEffect(()=>{
    const root = document.documentElement
    if (dark) { root.classList.add('dark'); localStorage.setItem('theme','dark') }
    else { root.classList.remove('dark'); localStorage.setItem('theme','light') }
  }, [dark])

  const { data: dash } = useFetch(`${API_BASE}/api/dashboard?period=${period}`, [period])
  const { data: cats } = useFetch(`${API_BASE}/api/categories`, [])

  const [filters, setFilters] = useState({ q: '', category_id: '', payment_method: '', date_from: '', date_to: '' })
  const query = useMemo(()=>{
    const p = new URLSearchParams()
    if (filters.q) p.set('q', filters.q)
    if (filters.category_id) p.set('category_id', filters.category_id)
    if (filters.payment_method) p.set('payment_method', filters.payment_method)
    if (filters.date_from) p.set('date_from', new Date(filters.date_from).toISOString())
    if (filters.date_to) p.set('date_to', new Date(filters.date_to).toISOString())
    p.set('limit', '100')
    return p.toString()
  }, [filters])

  const { data: expenses, loading: loadingExpenses, refetch, setData: setExpenses } = useFetch(`${API_BASE}/api/expenses?${query}`, [query])

  const [openDetail, setOpenDetail] = useState(false)
  const [selected, setSelected] = useState(null)

  const breakdownTotal = useMemo(()=> (dash?.breakdown || []).reduce((a,b)=> a+b.total, 0), [dash])

  const openRow = (e) => { setSelected(e); setOpenDetail(true) }
  const onSaved = async () => { setOpenDetail(false); await refetch() }
  const onDeleted = async () => { setOpenDetail(false); await refetch() }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Expense Tracker</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">{period.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e)=>setPeriod(e.target.value)} className="border rounded px-2 py-1 bg-white/70 dark:bg-slate-800">
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dark} onChange={e=>setDark(e.target.checked)} />
            Dark mode
          </label>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="text-gray-500 dark:text-slate-400">Total Spent</div>
          <div className="text-3xl font-bold">{currency(dash?.total_spent)}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="text-gray-500 dark:text-slate-400">Recent Transactions</div>
          <div className="text-3xl font-bold">{dash?.recent?.length || 0}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="text-gray-500 dark:text-slate-400">Categories Used</div>
          <div className="text-3xl font-bold">{dash?.breakdown?.length || 0}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Quick Add</h2>
        </div>
        <AddExpense categories={cats} onCreated={()=> refetch()} />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Search & Filters</h2>
          <ExportControls filters={filters} data={expenses} />
        </div>
        <Filters categories={cats} value={filters} onChange={setFilters} />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
        <h2 className="font-semibold mb-3">Category Breakdown</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {(dash?.breakdown || []).map((b,i)=> (
            <div key={i} className="border rounded p-3 dark:border-slate-700">
              <div className="text-gray-600 dark:text-slate-300">{b.category_name || 'Uncategorized'}</div>
              <div className="text-xl font-bold">{currency(b.total)}</div>
              <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded mt-2">
                <div className="h-2 bg-blue-500 rounded" style={{ width: `${breakdownTotal? (b.total / breakdownTotal * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
        <h2 className="font-semibold mb-3">Recent Expenses</h2>
        <div className="overflow-auto print:overflow-visible">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-gray-500 dark:text-slate-400">
                <th className="py-2">Date</th>
                <th className="py-2">Description</th>
                <th className="py-2">Category</th>
                <th className="py-2">Payment</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(expenses || []).map((e)=> (
                <tr key={e.id} className="border-t cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={()=> openRow(e)}>
                  <td className="py-2">{new Date(e.date).toLocaleString()}</td>
                  <td className="py-2">{e.description || '-'}</td>
                  <td className="py-2">{cats?.find(c=> c.id === e.category_id)?.name || '-'}</td>
                  <td className="py-2">{e.payment_method}</td>
                  <td className="py-2 text-right">{currency(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
        <BudgetPanel categories={cats || []} />
      </div>

      <ExpenseDetails open={openDetail} onClose={()=>setOpenDetail(false)} expense={selected} categories={cats || []} onSaved={onSaved} onDeleted={onDeleted} />
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="max-w-6xl mx-auto p-6 space-y-6 print:bg-white">
        <Dashboard />
      </div>
    </div>
  )
}
