const dashboardStats = [
  { label: "Total Users", value: "12,540" },
  { label: "KYC Pending", value: "314" },
  { label: "Blocked Users", value: "87" },
  { label: "Active Sessions", value: "1,203" },
];

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <p className="text-sm text-slate-600">
        Overview of platform activity and KYC health metrics.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {stat.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
