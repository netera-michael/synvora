export default function SettingsPage() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-12 text-center">
      <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
      <p className="mt-2 text-sm text-slate-500">
        Organization settings, themes, and user management will appear here. We&apos;ll wire it up after
        auth hardening.
      </p>
    </div>
  );
}
