export function APIInstructions() {
  return (
    <div className="rounded-lg bg-synvora-primary/5 border border-synvora-border p-4 space-y-3">
      <h3 className="font-semibold text-synvora-text">How to get Shopify API credentials:</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-synvora-text">
        <li>
          Go to your <strong>Shopify admin</strong> dashboard
        </li>
        <li>
          Navigate to <strong>Settings</strong> → <strong>Apps and sales channels</strong>
        </li>
        <li>
          Click <strong>&quot;Develop apps&quot;</strong> (you may need to allow custom app development first)
        </li>
        <li>
          Click <strong>&quot;Create an app&quot;</strong> and name it <strong>&quot;Synvora Sync&quot;</strong>
        </li>
        <li>
          Go to <strong>Configuration</strong> tab → <strong>Admin API integration</strong>
        </li>
        <li>
          Configure the following <strong>Admin API scopes</strong>:
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li><code className="bg-synvora-surface-active px-1 rounded">read_orders</code> (required)</li>
            <li><code className="bg-synvora-surface-active px-1 rounded">read_products</code> (optional)</li>
          </ul>
        </li>
        <li>
          Click <strong>Save</strong>, then go to <strong>API credentials</strong> tab
        </li>
        <li>
          Click <strong>&quot;Install app&quot;</strong> to install it on your store
        </li>
        <li>
          Copy the <strong>Admin API access token</strong> (starts with <code className="bg-synvora-surface-active px-1 rounded">shpat_</code>)
        </li>
        <li>
          Your <strong>store domain</strong> is: <code className="bg-synvora-surface-active px-1 rounded">your-store-name.myshopify.com</code>
        </li>
        <li>
          <strong>Webhook Setup:</strong> Go to <strong>Settings</strong> → <strong>Notifications</strong> → <strong>Webhooks</strong>. Create a webhook for <code className="bg-synvora-surface-active px-1 rounded">Order creation</code> pointing to:
          <br />
          <code className="bg-synvora-surface-active px-1 rounded block mt-1">https://synvora-psi.vercel.app/api/webhooks/shopify</code>
        </li>
      </ol>
      <p className="text-xs text-synvora-text-secondary pt-2 border-t border-synvora-border">
        ⚠️ <strong>Important:</strong> Keep your access token secure. Never share it publicly or commit it to version control.
      </p>
    </div>
  );
}
