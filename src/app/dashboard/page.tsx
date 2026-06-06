export default function DashboardOverview() {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome to your BAXATO enterprise dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Wallet Balance</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">₦0.00</p>
        </div>
      </div>
    </div>
  );
}
