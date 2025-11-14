import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || ''

function currency(n) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n || 0)
}

function useFetch(url, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    let mounted = true
    async function run() {
      if (!url) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(url)
        const json = await res.json()
        if (mounted) setData(json)
      } catch (e) {
        if (mounted) setError(String(e))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => { mounted = false }
  }, deps)
  return { data, loading, error, refresh: () => setData(null) }
}

function AddExpense({ categories, onCreated }) {
  const [form, setForm] = useState({ amount: '', category_id: '', description: '', payment_method: 'other', date: new Date().toISOString().slice(0,16) })
  const submit = async (e) => {
    e.preventDefault()
    const payload = {
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
      description: form.description || null,
      payment_method: form.payment_method,
      date: new Date(form.date).toISOString(),
    }
    const res = await fetch(`${API_BASE}/api/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    onCreated?.(json)
    setForm({ amount: '', category_id: '', description: '', payment_method: 'other', date: new Date().toISOString().slice(0,16) })
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <input value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} required type="number" step="0.01" placeholder="Amount" className="border rounded px-3 py-2" />
      <select value={form.category_id} onChange={e=>setForm(f=>({...f, category_id:e.target.value}))} className="border rounded px-3 py-2">
        <option value="">Category</option>
        {categories?.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} placeholder="Description" className="border rounded px-3 py-2" />
      <select value={form.payment_method} onChange={e=>setForm(f=>({...f, payment_method:e.target.value}))} className="border rounded px-3 py-2">
        <option>cash</option>
        <option>card</option>
        <option>bank</option>
        <option>wallet</option>
        <option>other</option>
      </select>
      <input value={form.date} onChange={e=>setForm(f=>({...f, date:e.target.value}))} type="datetime-local" className="border rounded px-3 py-2" />
      <button className="md:col-span-5 bg-blue-600 text-white rounded py-2 hover:bg-blue-700 transition">Add Expense</button>
    </form>
  )
}

function Dashboard() {
  const [period, setPeriod] = useState('month')
  const { data: dash, loading: loadingDash } = useFetch(`${API_BASE}/api/dashboard?period=${period}`, [period])
  const { data: cats } = useFetch(`${API_BASE}/api/categories`, [])
  const { data: expenses, loading: loadingExpenses, refresh } = useFetch(`${API_BASE}/api/expenses?limit=20`, [dash?.total_spent])

  const breakdownTotal = useMemo(()=> (dash?.breakdown || []).reduce((a,b)=> a+b.total, 0), [dash])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Expense Tracker</h1>
        <select value={period} onChange={(e)=>setPeriod(e.target.value)} className="border rounded px-2 py-1">
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-gray-500">Total Spent</div>
          <div className="text-3xl font-bold">{currency(dash?.total_spent)}</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-gray-500">Recent Transactions</div>
          <div className="text-3xl font-bold">{dash?.recent?.length || 0}</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-gray-500">Categories Used</div>
          <div className="text-3xl font-bold">{dash?.breakdown?.length || 0}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Quick Add</h2>
        </div>
        <AddExpense categories={cats} onCreated={()=> refresh()} />
      </div>

      <div className="bg-white rounded-lg p-4 shadow">
        <h2 className="font-semibold mb-3">Category Breakdown</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {(dash?.breakdown || []).map((b,i)=> (
            <div key={i} className="border rounded p-3">
              <div className="text-gray-600">{b.category_name || 'Uncategorized'}</div>
              <div className="text-xl font-bold">{currency(b.total)}</div>
              <div className="h-2 bg-gray-100 rounded mt-2">
                <div className="h-2 bg-blue-500 rounded" style={{ width: `${breakdownTotal? (b.total / breakdownTotal * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow">
        <h2 className="font-semibold mb-3">Recent Expenses</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-gray-500">
                <th className="py-2">Date</th>
                <th className="py-2">Description</th>
                <th className="py-2">Category</th>
                <th className="py-2">Payment</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(expenses || []).map((e)=> (
                <tr key={e.id} className="border-t">
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
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Dashboard />
      </div>
    </div>
  )
}
